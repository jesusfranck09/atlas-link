import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after the coordinator releases the shared CDP browser and deploys V9.
// This runner owns only its new contexts. It never closes the shared browser.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4430';
const output = path.join(root, 'evidence/daylight-v9');
const sizes = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile-emulated', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const phases = [
  { name: 'morning', hour: 6 }, { name: 'day', hour: 11 },
  { name: 'sunset', hour: 16 }, { name: 'night', hour: 19 },
];
const localTime = (hour, minute = 0, second = 0) => new Date(`2026-09-24T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}-06:00`);
const sanitize = value => String(value).replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]').replace(/AtlasDemo\d+!/g, '[DEMO_PASSWORD]');
const report = {
  startedAt: new Date().toISOString(), baseURL,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workingTree: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean),
  environment: { node: process.version, os: `${os.type()} ${os.release()} ${os.arch()}`, timezone: 'America/Mexico_City unless specified' },
  scope: 'V9 decorative lighting on real local landing, hospital and Atlas console. Playwright clock controls browser time only. Auth uses real demo UI/API, no intercepted responses or invented sessions. No commercial-form submission or business-data changes.',
  limits: 'Mobile is Chrome touch emulation, not physical Android/iOS. Focus/visibility resync is exercised with DOM event dispatch. Axe color contrast is automated coverage, not a complete accessibility audit. No production, FPS, battery, Safari or Windows claims.',
  checks: [], browserErrors: [],
};
const contexts = new Set();
let browser;
try {
  const earlier = JSON.parse(await readFile(path.join(output, 'report.json'), 'utf8'));
  if (!earlier.passed) report.initialAttempt = { startedAt: earlier.startedAt, finishedAt: earlier.finishedAt, totals: earlier.totals, failedChecks: earlier.checks.filter(item => item.status === 'fail'), diagnosis: 'Both initial failures were test expectations: initial Next navigation events were counted as reloads, and nonzero global duration was checked instead of disabled transition-property on drawn light layers.' };
} catch (error) { if (error.code !== 'ENOENT') throw error; }

async function capture(page, name) {
  await mkdir(output, { recursive: true });
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), animations: 'disabled' });
  return `evidence/daylight-v9/${filename}`;
}

async function scenario(name, options, action) {
  const { name: ignoredName, ...contextOptions } = options;
  const context = await browser.newContext({ locale: 'es-MX', timezoneId: 'America/Mexico_City', ...contextOptions });
  contexts.add(context);
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.browserErrors.push({ scenario: name, kind: 'pageerror', message: sanitize(error.message) }));
    page.on('console', message => {
      if (message.type() === 'error') report.browserErrors.push({ scenario: name, kind: 'console', message: sanitize(message.text()) });
    });
    const detail = await action(page);
    report.checks.push({ name, status: 'pass', ...detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, status: 'fail', message: sanitize(error.message) });
    console.log(`FAIL ${name}: ${sanitize(error.message).split('\n')[0]}`);
  } finally {
    await context.close();
    contexts.delete(context);
  }
}

async function ready(page, phase, surface = 'landing') {
  const layer = page.locator(`[data-daylight][data-surface="${surface}"]`);
  await expect(layer).toHaveAttribute('data-ready', 'true');
  await expect(layer).toHaveAttribute('data-daylight', phase);
  await expect(layer).toHaveAttribute('aria-hidden', 'true');
  await expect(layer).toHaveCSS('pointer-events', 'none');
  const targetOpacity = surface === 'workspace' ? (page.viewportSize().width <= 760 ? '.48' : '.58') : (page.viewportSize().width <= 760 ? '.88' : '1');
  await expect.poll(() => layer.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(Number(targetOpacity));
  return layer;
}

async function geometry(page, layer) {
  const result = await layer.evaluate(el => ({
    phase: el.dataset.daylight, height: el.getBoundingClientRect().height,
    opacity: getComputedStyle(el).opacity, pointerEvents: getComputedStyle(el).pointerEvents,
    viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
    animations: [el, ...el.children].map(item => getComputedStyle(item).animationName),
    localHour: new Date().getHours(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));
  expect(result.documentWidth).toBeLessThanOrEqual(result.viewportWidth);
  expect(result.animations.every(value => value === 'none')).toBe(true);
  return result;
}

async function contrast(page) {
  const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const violations = result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }));
  expect(violations).toEqual([]);
  return { violations, incomplete: result.incomplete.map(item => ({ id: item.id, nodeCount: item.nodes.length })) };
}

try {
  browser = await chromium.connectOverCDP(process.env.QA_CDP_URL || 'http://127.0.0.1:9430');
  report.environment.browser = browser.version();

  for (const size of sizes) for (const phase of phases) {
    await scenario(`landing-${phase.name}-${size.name}`, size, async page => {
      await page.clock.setFixedTime(localTime(phase.hour));
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      const layer = await ready(page, phase.name);
      const result = await geometry(page, layer);
      expect(result.localHour).toBe(phase.hour);
      if (size.isMobile) {
        await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Cerrar navegación', exact: true })).toHaveAttribute('aria-expanded', 'true');
        await page.getByRole('button', { name: 'Cerrar navegación', exact: true }).click();
      } else {
        const cta = page.getByRole('link', { name: 'Explorar plataforma', exact: true });
        await expect(cta).toBeVisible();
        await cta.click({ trial: true });
      }
      const runAxe = (!size.isMobile && ['morning', 'sunset'].includes(phase.name)) || (size.isMobile && phase.name === 'night');
      const axeContrast = runAxe ? await contrast(page) : undefined;
      return { ...result, controlsReachable: true, screenshot: await capture(page, `landing-${phase.name}-${size.name}`), ...(axeContrast ? { axeContrast } : {}) };
    });
  }

  for (const [timezoneId, phase, hour] of [['America/Mexico_City', 'day', 11], ['Asia/Tokyo', 'night', 2]]) {
    await scenario(`same-instant-${timezoneId}`, { ...sizes[0], timezoneId }, async page => {
      const instant = new Date('2026-09-24T17:00:00Z');
      await page.clock.setFixedTime(instant);
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      const detail = await geometry(page, await ready(page, phase));
      expect(detail.localHour).toBe(hour);
      return { instant: instant.toISOString(), ...detail };
    });
  }

  await scenario('automatic-minute-boundary-without-navigation', sizes[0], async page => {
    await page.clock.install({ time: localTime(10, 58) });
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const layer = await ready(page, 'morning');
    const initialNavigationEvents = navigations;
    await page.clock.pauseAt(localTime(10, 59, 59));
    await expect(layer).toHaveAttribute('data-daylight', 'morning');
    await page.clock.runFor(1000);
    await expect(layer).toHaveAttribute('data-daylight', 'day');
    expect(navigations).toBe(initialNavigationEvents);
    return { before: '10:59:59 morning', after: '11:00:00 day', initialNavigationEvents, additionalNavigationEvents: navigations - initialNavigationEvents, clock: 'install + pauseAt + runFor' };
  });

  await scenario('focus-and-visibility-resynchronization', sizes[0], async page => {
    await page.clock.setFixedTime(localTime(8, 15));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const layer = await ready(page, 'morning');
    await page.clock.setFixedTime(localTime(17, 15));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(layer).toHaveAttribute('data-daylight', 'sunset');
    await page.clock.setFixedTime(localTime(21, 15));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(layer).toHaveAttribute('data-daylight', 'night');
    return { mechanism: 'DOM event dispatch following clock change', focus: 'sunset', visibilitychange: 'night' };
  });

  await scenario('server-render-with-javascript-disabled', { ...sizes[0], javaScriptEnabled: false }, async page => {
    const response = await page.goto(baseURL, { waitUntil: 'load' });
    const html = await response.text();
    expect(html).toContain('data-ready="false"');
    const layer = page.locator('[data-daylight]');
    await expect(layer).toHaveAttribute('data-ready', 'false');
    await expect(layer).toHaveCSS('opacity', '0');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    return { lightVisible: false, ready: false, serverHTMLHasNeutralInitialState: true, contentReadable: true };
  });

  await scenario('reduced-motion-no-light-transitions', { ...sizes[0], reducedMotion: 'reduce' }, async page => {
    await page.clock.setFixedTime(localTime(16));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const layer = await ready(page, 'sunset');
    const transitions = await layer.evaluate(el => [el, ...el.children].flatMap(item => [null, '::before', '::after'].map(pseudo => {
      const style = getComputedStyle(item, pseudo);
      return { pseudo, drawn: !pseudo || !['none', 'normal'].includes(style.content), property: style.transitionProperty, duration: style.transitionDuration };
    })).filter(item => item.drawn));
    expect(transitions.every(item => item.property === 'none')).toBe(true);
    expect(await layer.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    return { transitionProperties: [...new Set(transitions.map(item => item.property))], computedDurations: [...new Set(transitions.map(item => item.duration))], drawnElementsAndPseudoElements: transitions.length, runningAnimations: 0 };
  });

  await scenario('forced-colors-hides-decoration', { ...sizes[0], forcedColors: 'active' }, async page => {
    await page.clock.setFixedTime(localTime(19));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const layer = page.locator('[data-daylight]');
    await expect(layer).toHaveAttribute('data-ready', 'true');
    await expect(layer).toHaveCSS('display', 'none');
    return { forcedColors: 'active', lightDisplay: 'none' };
  });

  for (const surface of [{ name: 'hospital', route: '/login', destination: '/hospital', profile: 'hospital_admin' }, { name: 'atlas', route: '/admin/login', destination: '/admin', profile: 'platform_admin' }]) {
    for (const size of sizes) await scenario(`${surface.name}-${size.name}`, size, async page => {
      await page.clock.setFixedTime(localTime(17));
      await page.goto(`${baseURL}${surface.route}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-daylight]')).toHaveCount(0);
      await page.getByTestId(`demo-${surface.profile}`).click();
      const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      await expect(page).toHaveURL(`${baseURL}${surface.destination}`);
      await expect(page.getByRole('main')).toBeVisible();
      const layer = await ready(page, 'sunset', 'workspace');
      const detail = await geometry(page, layer);
      expect(detail.height).toBeLessThanOrEqual(320);
      expect(Number(detail.opacity)).toBeLessThan(0.6);
      if (size.isMobile) {
        await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Módulos del espacio' })).toBeVisible();
        await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toHaveAttribute('aria-expanded', 'false');
      } else {
        await page.getByRole('button', { name: 'Centro de ayuda', exact: true }).filter({ visible: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: 'Entendido' }).click();
      }
      const axeContrast = size.isMobile ? undefined : await contrast(page);
      const screenshot = await capture(page, `${surface.name}-sunset-${size.name}`);
      if (size.isMobile) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).filter({ visible: true }).click();
      await expect(page).toHaveURL(`${baseURL}${surface.route}`);
      return { ...detail, authHTTP: response.status(), menusReachable: true, loggedOut: true, screenshot, ...(axeContrast ? { axeContrast } : {}) };
    });
  }
} catch (error) {
  report.checks.push({ name: 'runner', status: 'block', message: sanitize(error.message) });
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  report.finishedAt = new Date().toISOString();
  report.totals = { pass: report.checks.filter(item => item.status === 'pass').length, fail: report.checks.filter(item => item.status === 'fail').length, block: report.checks.filter(item => item.status === 'block').length };
  report.passed = report.totals.pass === 19 && report.totals.fail === 0 && report.totals.block === 0 && report.browserErrors.length === 0;
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, totals: report.totals, browserErrors: report.browserErrors }, null, 2));
  process.exit(report.passed ? 0 : 1);
}
