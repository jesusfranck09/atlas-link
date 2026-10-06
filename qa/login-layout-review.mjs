import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run only after the coordinator confirms the V7 build is serving this URL.
// Reuses the shared Chrome process; closes only contexts created by this runner.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4430';
const cdpURL = process.env.QA_CDP_URL || 'http://127.0.0.1:9430';
const output = path.join(root, 'evidence/login-v7');
const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
  { name: 'narrow-320', width: 320, height: 740, mobile: true },
];
const profiles = [
  { id: 'hospital_admin', prefix: 'admin', name: 'Ana Beltrán', role: 'HOSPITAL_ADMIN' },
  { id: 'billing', prefix: 'caja', name: 'Camila Vega', role: 'BILLING' },
  { id: 'reviewer', prefix: 'auditor', name: 'Diego Navarro', role: 'REVIEWER' },
  { id: 'director', prefix: 'direccion', name: 'Elena Robles', role: 'DIRECTOR' },
  { id: 'insurer_demo', prefix: 'aseguradora', name: 'Santiago Cruz', role: 'INSURER_DEMO' },
  { id: 'disabled', prefix: 'baja', name: 'Cuenta desactivada', role: 'BILLING' },
  { id: 'platform_admin', prefix: 'atlas', name: 'Marina Solís', role: 'PLATFORM_ADMIN' },
].map(profile => ({ ...profile, email: `${profile.prefix}@demo.atlaslink.mx` }));
const surfaces = [
  { name: 'hospital', route: '/login', destination: '/hospital', profiles: profiles.slice(0, 6) },
  { name: 'company', route: '/admin/login', destination: '/admin', profiles: profiles.slice(6) },
];
const report = {
  startedAt: new Date().toISOString(), baseURL, cdpURL,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workingTree: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean),
  environment: { node: process.version, platform: `${os.type()} ${os.release()} ${os.arch()}` },
  sources: ['docs/review-login-v7.md', 'AGENTS.md', 'qa/tests/journeys.spec.ts', 'backend/ntx-msa-identity-service/src/main/java/mx/atlaslink/auth/IdentityService.java', 'frontend/nxt-ui-atlas-link/src/components/workspace.tsx'],
  scope: 'Both real login UIs, demo-profile API, credential submission and logout through the local gateway and identity service. No API interception or fabricated sessions. Existing synthetic demo users only. Initial layout and axe at four viewport sizes per login.',
  exclusions: 'No production deployment, external messages, payment effects, data edits, full portal regression, persistence write/recovery test, physical mobile, Safari or Windows validation. A green run does not establish aesthetic acceptance or comprehensive accessibility/security.',
  checks: [], views: [], runtimeErrors: [], consoleErrors: [], httpFailures: [],
};
const ownedContexts = new Set();
let browser;
let currentScenario = 'setup';
const sanitize = text => String(text)
  .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
  .replace(/AtlasDemo\d+!/g, '[DEMO_PASSWORD]');
const pathname = url => { try { return new URL(url).pathname; } catch { return '[invalid URL]'; } };

async function check(name, action) {
  try {
    const details = await action();
    report.checks.push({ name, status: 'pass', ...details });
    return true;
  } catch (error) {
    report.checks.push({ name, status: 'fail', message: sanitize(error.message) });
    return false;
  }
}

function block(name, dependency) {
  report.checks.push({ name, status: 'block', dependency });
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = element => {
      if (!element) return null;
      const { x, y, top, right, bottom, left, width, height } = element.getBoundingClientRect();
      return { x, y, top, right, bottom, left, width, height };
    };
    const visibleText = element => {
      const result = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent.trim()) continue;
        const parent = node.parentElement;
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.clipPath !== 'none' || style.clip !== 'auto') continue;
        const range = document.createRange(); range.selectNodeContents(node);
        const bounds = range.getBoundingClientRect();
        if (bounds.width > 1 && bounds.height > 1) result.push({ text: node.textContent.trim(), fontSize: style.fontSize, lineHeight: style.lineHeight, rect: rect(range) });
      }
      return result;
    };
    const photo = document.querySelector('[data-login-photo]');
    const heading = document.querySelector('h1');
    const buttons = [...document.querySelectorAll('[data-testid^="demo-"]')];
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      form: rect(document.querySelector('[data-login-form]')),
      demos: rect(document.querySelector('[data-login-demos]')),
      photo: { ...rect(photo), display: photo ? getComputedStyle(photo).display : null },
      content: rect(document.querySelector('[data-login-content]')),
      footer: rect(document.querySelector('main > footer')),
      heading: { text: heading?.textContent, fontSize: heading ? getComputedStyle(heading).fontSize : null, rect: rect(heading) },
      inputs: [...document.querySelectorAll('input')].map(input => ({ name: input.name, rect: rect(input), fontSize: getComputedStyle(input).fontSize })),
      submit: rect(document.querySelector('button[type="submit"]')),
      buttons: buttons.map(button => ({ id: button.dataset.testid, rect: rect(button), visibleText: visibleText(button), scrollWidth: button.scrollWidth, clientWidth: button.clientWidth })),
    };
  });
}

async function captures(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, `${name}-viewport.png`), fullPage: false, animations: 'disabled', caret: 'hide' });
  await page.screenshot({ path: path.join(output, `${name}-full.png`), fullPage: true, animations: 'disabled', caret: 'hide' });
  return { files: [`${name}-viewport.png`, `${name}-full.png`] };
}

async function runView(viewport, surface) {
  const name = `${viewport.name}-${surface.name}`;
  currentScenario = name;
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.mobile, hasTouch: viewport.mobile, deviceScaleFactor: viewport.mobile ? 2 : 1, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
  ownedContexts.add(context);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(20000);
  const runtimeStart = report.runtimeErrors.length;
  const httpStart = report.httpFailures.length;
  let loginRequests = 0;
  let expectedLoginRejection = false;
  page.on('pageerror', error => report.runtimeErrors.push({ scenario: name, message: sanitize(error.message) }));
  page.on('request', request => { if (pathname(request.url()) === '/api/auth/login' && request.method() === 'POST') loginRequests++; });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const location = pathname(message.location().url || '');
    const expected = expectedLoginRejection && location === '/api/auth/login' && /401/.test(message.text());
    report.consoleErrors.push({ scenario: name, expected, path: location, message: sanitize(message.text()) });
  });
  page.on('response', response => {
    if (response.status() < 400) return;
    report.httpFailures.push({ scenario: name, path: pathname(response.url()), status: response.status(), expected: expectedLoginRejection && pathname(response.url()) === '/api/auth/login' && response.status() === 401 });
  });
  const view = { name, route: surface.route, viewport, metrics: null, violations: null };
  report.views.push(view);
  try {
    let serverProfiles;
    const ready = await check(`${name}:ready`, async () => {
      const demosResponse = page.waitForResponse(response => pathname(response.url()) === '/api/auth/demo-profiles' && response.request().method() === 'GET');
      const [navigation, response] = await Promise.all([page.goto(`${baseURL}${surface.route}`, { waitUntil: 'domcontentloaded' }), demosResponse]);
      expect(navigation.status()).toBe(200);
      expect(response.status()).toBe(200);
      serverProfiles = await response.json();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bienvenido.');
      await expect(page.locator('[data-login-form]')).toBeVisible();
      await expect(page.locator('[data-login-content]')).toBeVisible();
      await expect(page.locator('[data-login-demos] [data-testid^="demo-"]')).toHaveCount(surface.profiles.length);
      await page.evaluate(() => document.fonts.ready);
      if (!viewport.mobile) await expect.poll(() => page.locator('[data-login-photo] img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      view.metrics = await measure(page);
      return { profiles: surface.profiles.length };
    });
    if (!ready) {
      for (const dependent of ['overflow', 'alignment', 'photo', 'profile-layout', 'screenshots', 'axe', 'autofill', 'password-toggle', 'selection-reset']) block(`${name}:${dependent}`, `${name}:ready`);
      return;
    }
    const m = view.metrics;
    await check(`${name}:no-horizontal-overflow`, async () => {
      expect(m.document.scrollWidth).toBeLessThanOrEqual(m.viewport.width);
      for (const button of m.buttons) expect(button.scrollWidth, button.id).toBeLessThanOrEqual(button.clientWidth);
      return { viewportWidth: m.viewport.width, scrollWidth: m.document.scrollWidth, documentHeight: m.document.height };
    });
    await check(`${name}:form-demo-alignment`, async () => {
      expect(Math.abs(m.form.left - m.demos.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.form.right - m.demos.right)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.form.left - m.submit.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.form.right - m.submit.right)).toBeLessThanOrEqual(1);
      return { form: m.form, demos: m.demos, submit: m.submit };
    });
    await check(`${name}:${viewport.mobile ? 'photo-hidden' : 'photo-alignment'}`, async () => {
      if (viewport.mobile) {
        await expect(page.locator('[data-login-photo]')).toBeHidden();
        expect(m.photo.height).toBe(0);
      } else {
        expect(Math.abs(m.photo.top - m.content.top)).toBeLessThanOrEqual(1);
        expect(Math.abs(m.photo.bottom - m.content.bottom)).toBeLessThanOrEqual(1);
      }
      return { photo: m.photo, content: m.content };
    });
    await check(`${name}:profile-layout-and-accessible-details`, async () => {
      for (const profile of surface.profiles) {
        const button = page.getByTestId(`demo-${profile.id}`);
        await expect(button).toHaveAccessibleName(new RegExp(profile.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        await expect(button).toHaveAccessibleName(new RegExp(profile.email.replaceAll('.', '\\.')));
      }
      for (const button of m.buttons) {
        expect(button.visibleText.some(text => text.text.includes('@')), `${button.id} hides email visually`).toBe(false);
        for (const text of button.visibleText) {
          expect(text.rect.left, button.id).toBeGreaterThanOrEqual(button.rect.left - 1);
          expect(text.rect.right, button.id).toBeLessThanOrEqual(button.rect.right + 1);
          expect(text.rect.bottom, button.id).toBeLessThanOrEqual(button.rect.bottom + 1);
        }
      }
      if (surface.name === 'hospital') {
        const columns = new Set(m.buttons.map(button => Math.round(button.rect.left)));
        const rows = new Set(m.buttons.map(button => Math.round(button.rect.top)));
        expect(columns.size).toBe(2);
        expect(rows.size).toBe(3);
      }
      return { heading: m.heading, profiles: m.buttons };
    });
    if (viewport.name === 'desktop-1366') await check(`${name}:first-screen-profiles-and-footer-gap`, async () => {
      const bottom = Math.max(...m.buttons.map(button => button.rect.bottom));
      expect(m.buttons.every(button => button.rect.top >= 0 && button.rect.bottom <= viewport.height)).toBe(true);
      expect(m.footer.top - bottom).toBeGreaterThan(0);
      expect(m.footer.bottom).toBeLessThanOrEqual(viewport.height);
      return { profileBottom: bottom, footerTop: m.footer.top, footerBottom: m.footer.bottom, profileToFooterGap: m.footer.top - bottom };
    });
    await check(`${name}:screenshots`, () => captures(page, name));
    await check(`${name}:axe`, async () => {
      const results = await new AxeBuilder({ page }).analyze();
      view.violations = results.violations.map(({ id, impact, description, nodes, helpUrl }) => ({ id, impact, description, helpUrl, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }));
      view.axe = { version: results.testEngine.version, passes: results.passes.length, incomplete: results.incomplete.length, inapplicable: results.inapplicable.length };
      await writeFile(path.join(output, `${name}-axe.json`), JSON.stringify({ ...view.axe, violations: view.violations }, null, 2));
      expect(view.violations).toEqual([]);
      return { ...view.axe, violations: 0 };
    });
    await check(`${name}:all-demo-profiles-autofill-without-submit`, async () => {
      const startRequests = loginRequests;
      for (const profile of surface.profiles) {
        const supplier = serverProfiles.find(candidate => candidate.email === profile.email);
        expect(supplier?.role).toBe(profile.role);
        expect(typeof supplier.password).toBe('string');
        await page.getByTestId(`demo-${profile.id}`).click();
        await expect(page.getByLabel('Correo institucional')).toHaveValue(profile.email);
        await expect(page.locator('input[name="password"]')).toHaveValue(supplier.password);
        await expect(page.getByTestId(`demo-${profile.id}`)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-testid^="demo-"][aria-pressed="true"]')).toHaveCount(1);
        expect(pathname(page.url())).toBe(surface.route);
      }
      expect(loginRequests - startRequests).toBe(0);
      return { profileIds: surface.profiles.map(profile => profile.id), loginRequests: loginRequests - startRequests };
    });
    await check(`${name}:password-toggle`, async () => {
      const input = page.locator('input[name="password"]');
      const previous = await input.inputValue();
      await expect(input).toHaveAttribute('type', 'password');
      await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
      await expect(input).toHaveAttribute('type', 'text');
      await expect(page.getByRole('button', { name: 'Ocultar contraseña', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
      await expect(input).toHaveAttribute('type', 'password');
      await expect(input).toHaveValue(previous);
      return { valuePreserved: true };
    });
    await check(`${name}:selection-clears-when-either-input-edited`, async () => {
      const button = page.getByTestId(`demo-${surface.profiles[0].id}`);
      for (const [selector, value] of [['input[name="email"]', 'edited@example.test'], ['input[name="password"]', 'synthetic-qa-edit']]) {
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await page.locator(selector).fill(value);
        await expect(page.locator('[data-testid^="demo-"][aria-pressed="true"]')).toHaveCount(0);
      }
      return { editedInputs: ['email', 'password'] };
    });
    if (viewport.name === 'desktop-1366' && surface.name === 'hospital') {
      await check('disabled-demo-account-rejected', async () => {
        await page.getByTestId('demo-disabled').click();
        expectedLoginRejection = true;
        const responsePromise = page.waitForResponse(response => pathname(response.url()) === '/api/auth/login' && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
        const response = await responsePromise;
        expect(response.status()).toBe(401);
        await expect(page.locator('[data-login-form]').getByRole('alert')).toBeVisible();
        expect(pathname(page.url())).toBe(surface.route);
        expect(await page.evaluate(() => sessionStorage.getItem('atlas.session'))).toBeNull();
        await page.screenshot({ path: path.join(output, 'disabled-account-error.png'), fullPage: true, animations: 'disabled', mask: [page.locator('input[name="password"]')] });
        return { httpStatus: response.status(), sessionAbsent: true, alert: await page.locator('[data-login-form]').getByRole('alert').textContent() };
      });
    }
    if (viewport.name === 'desktop-1366') {
      const authenticated = await check(`${surface.name}:real-login`, async () => {
        expectedLoginRejection = false;
        await page.getByTestId(`demo-${surface.profiles[0].id}`).click();
        const responsePromise = page.waitForResponse(response => pathname(response.url()) === '/api/auth/login' && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
        expect((await responsePromise).status()).toBe(200);
        await expect.poll(() => pathname(page.url())).toBe(surface.destination);
        await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
        const user = await page.evaluate(() => { const session = JSON.parse(sessionStorage.getItem('atlas.session') || 'null'); return session ? { role: session.user.role, email: session.user.email, hasToken: Boolean(session.token) } : null; });
        expect(user.role).toBe(surface.profiles[0].role);
        expect(user.email).toBe(surface.profiles[0].email);
        expect(user.hasToken).toBe(true);
        return { destination: pathname(page.url()), role: user.role, tokenPresent: user.hasToken };
      });
      if (authenticated) await check(`${surface.name}:real-logout`, async () => {
        const responsePromise = page.waitForResponse(response => pathname(response.url()) === '/api/auth/logout' && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
        expect((await responsePromise).status()).toBe(204);
        await expect.poll(() => pathname(page.url())).toBe(surface.route);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bienvenido.');
        expect(await page.evaluate(() => sessionStorage.getItem('atlas.session'))).toBeNull();
        return { destination: pathname(page.url()), sessionAbsent: true };
      });
      else block(`${surface.name}:real-logout`, `${surface.name}:real-login`);
    }
  } finally {
    await check(`${name}:no-runtime-or-unexpected-http-errors`, async () => {
      const errors = report.runtimeErrors.slice(runtimeStart);
      const failures = report.httpFailures.slice(httpStart).filter(failure => !failure.expected);
      const consoleErrors = report.consoleErrors.filter(error => error.scenario === name && !error.expected);
      expect(errors).toEqual([]);
      expect(failures).toEqual([]);
      expect(consoleErrors).toEqual([]);
      return { pageErrors: 0, unexpectedHttpErrors: 0, unexpectedConsoleErrors: 0 };
    });
    await context.close();
    ownedContexts.delete(context);
  }
}

await mkdir(output, { recursive: true });
try {
  browser = await chromium.connectOverCDP(cdpURL);
  report.environment.browser = browser.version();
  report.environment.playwright = JSON.parse(await readFile(path.join(root, 'qa/node_modules/@playwright/test/package.json'), 'utf8')).version;
  for (const viewport of viewports) for (const surface of surfaces) await runView(viewport, surface);
} catch (error) {
  report.checks.push({ name: `${currentScenario}:runner`, status: 'fail', message: sanitize(error.message) });
} finally {
  for (const context of ownedContexts) await context.close().catch(() => {});
  report.finishedAt = new Date().toISOString();
  report.counts = Object.fromEntries(['pass', 'fail', 'skip', 'block'].map(status => [status, report.checks.filter(check => check.status === status).length]));
  report.passed = report.views.length === 8 && report.counts.pass > 0 && report.counts.fail === 0 && report.counts.block === 0;
  await writeFile(path.join(output, 'review.json'), JSON.stringify(report, null, 2));
  const rows = report.views.map(view => {
    const m = view.metrics;
    return `| ${view.name} | ${m ? `${m.document.scrollWidth} / ${m.viewport.width}` : 'blocked'} | ${m?.document.height ?? '—'} | ${m?.heading.fontSize ?? '—'} | ${m ? `${m.form.width} / ${m.demos.width}` : '—'} | ${view.violations?.length ?? 'not run'} |`;
  });
  const failures = report.checks.filter(check => check.status !== 'pass').map(check => `- ${check.status.toUpperCase()} ${check.name}: ${check.message || check.dependency}`);
  await writeFile(path.join(output, 'report.md'), [
    '# Login V7 — focused integrated QA', '',
    `Executed: ${report.startedAt}. Revision: ${report.revision}. URL: ${baseURL}.`, '',
    `Result: ${report.counts.pass} pass, ${report.counts.fail} fail, ${report.counts.skip} skip, ${report.counts.block} block.`, '',
    report.scope, '', report.exclusions, '',
    '| View | Scroll / viewport width | Document height | Heading size | Form / demos width | Axe violations |',
    '| --- | --- | --- | --- | --- | --- |', ...rows, '',
    'Each view has initial viewport/full screenshots and sanitized axe results. review.json contains exact geometry, request outcomes and all checks. Credentials and bearer tokens are not stored.', '',
    ...failures, '',
    '`QA_BASE_URL=http://127.0.0.1:4430 node qa/login-layout-review.mjs`', '',
  ].join('\n'));
  console.log(JSON.stringify({ passed: report.passed, counts: report.counts, views: report.views.length, errors: report.checks.filter(check => check.status === 'fail'), report: 'evidence/login-v7/review.json' }, null, 2));
  // Do not call browser.close(): this is the coordinator's shared CDP browser.
  process.exit(report.passed ? 0 : 1);
}
