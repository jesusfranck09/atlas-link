// Run only after the coordinator confirms "V10 desplegado" and releases CDP.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4430';
const output = path.join(root, 'evidence/premium-v10/after');
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER) : null;
let plannedChecks = 0;
const sizes = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'mobile-320', viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true },
];
const phases = [{ name: 'morning', hour: 8 }, { name: 'day', hour: 14 }, { name: 'sunset', hour: 17 }, { name: 'night', hour: 21 }];
const instant = (hour, minute = 0, second = 0) => new Date(`2026-09-24T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}-06:00`);
const report = {
  startedAt: new Date().toISOString(), baseURL,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workingTree: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean),
  scope: 'V10 solar/lunar sources, shared component CSS and read-only UI interactions on the real local production build. Browser clock controlled in America/Mexico_City. Actual demo authentication/API; no request mocks, commercial submission or business-data writes.',
  limits: 'Chrome on macOS; 390/320 widths are mobile/touch emulation. Screenshots and computed geometry do not certify aesthetic acceptance. Broader route/accessibility checks are reported separately by production-smoke.mjs extended.',
  reusedEvidence: 'Clock timezone interpretation and neutral SSR were validated in evidence/daylight-v9/report.json; those unchanged internals are not retested here.',
  checks: [], errors: [],
};
const sanitize = value => String(value).replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]').replace(/AtlasDemo\d+!/g, '[DEMO_PASSWORD]');
let browser;
const owned = new Set();

async function scenario(name, size, fn) {
  if (filter && !filter.test(name)) return;
  plannedChecks++;
  const { name: sizeName, ...options } = size;
  const context = await browser.newContext({ locale: 'es-MX', timezoneId: 'America/Mexico_City', ...options });
  owned.add(context);
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.errors.push({ name, type: 'pageerror', message: sanitize(error.message) }));
    page.on('console', message => { if (message.type() === 'error') report.errors.push({ name, type: 'console', message: sanitize(message.text()) }); });
    const detail = await fn(page);
    report.checks.push({ name, status: 'pass', ...detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, status: 'fail', message: sanitize(error.message) });
    console.log(`FAIL ${name}: ${sanitize(error.message).split('\n')[0]}`);
  } finally { await context.close(); owned.delete(context); }
}

async function capture(page, name) {
  const file = `${name}.png`;
  for (const chart of await page.locator('[data-analytics-sculpture]').all()) {
    const bounds = await chart.boundingBox();
    if (bounds && bounds.y < page.viewportSize().height && bounds.y + bounds.height > 0) {
      await expect(chart).not.toHaveAttribute('data-renderer', 'loading');
    }
  }
  await page.screenshot({ path: path.join(output, file), animations: 'disabled' });
  return `evidence/premium-v10/after/${file}`;
}

async function phaseReady(page, phase, surface = 'landing') {
  const layer = page.locator(`[data-daylight][data-surface="${surface}"]`);
  await expect(page.locator('[data-daylight]')).toHaveCount(1);
  await expect(layer).toHaveAttribute('data-ready', 'true');
  await expect(layer).toHaveAttribute('data-daylight', phase);
  await expect(layer).toHaveAttribute('aria-hidden', 'true');
  await expect(layer).toHaveCSS('pointer-events', 'none');
  if (surface === 'workspace') await expect(page.locator('[data-celestial]')).toHaveAttribute('data-celestial', phase);
  return layer;
}

async function geometry(page, phase, workspace = false) {
  const result = await page.evaluate(({ phase, workspace }) => {
    const orb = document.querySelector(workspace ? '[data-celestial] [data-daylight-orb]' : '[data-surface="landing"] [data-daylight-orb]');
    const source = workspace ? orb.closest('[data-celestial]') : orb.closest('[data-daylight]');
    const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const r = box(orb);
    const pseudo = getComputedStyle(orb, phase === 'night' ? '::after' : '::before');
    const length = (value, size) => value.endsWith('%') ? parseFloat(value) / 100 * size : parseFloat(value);
    const left = length(pseudo.left, r.width) || 0;
    const top = length(pseudo.top, r.height) || 0;
    const width = length(pseudo.width, r.width) || r.width;
    const height = length(pseudo.height, r.height) || r.height;
    const disk = { left: r.left + left, top: r.top + top, width, height, right: r.left + left + width, bottom: r.top + top + height };
    const intersects = other => disk.left < other.right && disk.right > other.left && disk.top < other.bottom && disk.bottom > other.top;
    const targets = workspace
      ? [...document.querySelectorAll('[data-workspace] > header a, [data-workspace] > header button, [data-workspace] > header input')]
      : [document.querySelector('h1'), document.querySelector('[data-hero-eyebrow]')];
    const textRects = el => {
      const rects = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        rects.push(...range.getClientRects());
      }
      return rects;
    };
    const overlaps = targets.filter(Boolean).filter(el => el.getClientRects().length && (el.tagName === 'H1' ? textRects(el).some(intersects) : intersects(box(el)))).map(el => el.getAttribute('aria-label') || el.textContent.trim());
    return {
      phase, disk, source: box(source), sourceOpacity: getComputedStyle(source).opacity, sourcePointerEvents: getComputedStyle(source).pointerEvents,
      pseudoOpacity: pseudo.opacity, pseudoBackground: pseudo.backgroundImage, pseudoContent: pseudo.content, overlaps,
      viewportWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth,
      header: workspace ? box(document.querySelector('[data-workspace] > header')) : null,
    };
  }, { phase, workspace });
  expect(Number(result.sourceOpacity)).toBeGreaterThan(0);
  expect(Number(result.pseudoOpacity)).toBeGreaterThan(0);
  expect(result.pseudoContent).not.toBe('none');
  expect(result.disk.width).toBeGreaterThan(0);
  expect(result.disk.height).toBeGreaterThan(0);
  expect(result.disk.left).toBeGreaterThanOrEqual(0);
  expect(result.disk.right).toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.documentWidth).toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.overlaps).toEqual([]);
  if (workspace) {
    expect(result.sourcePointerEvents).toBe('none');
    expect(result.disk.top).toBeGreaterThanOrEqual(result.header.top);
    expect(result.disk.bottom).toBeLessThanOrEqual(result.header.bottom);
  }
  return result;
}

async function mediaPreferences(page, workspace = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const layers = workspace ? '[data-daylight], [data-celestial]' : '[data-daylight]';
  const transitions = await page.locator(layers).evaluateAll(elements => elements.flatMap(root => [root, ...root.querySelectorAll('*')]).flatMap(el => [null, '::before', '::after'].map(pseudo => {
    const style = getComputedStyle(el, pseudo);
    return { drawn: !pseudo || !['none', 'normal'].includes(style.content), property: style.transitionProperty, duration: style.transitionDuration };
  })).filter(item => item.drawn));
  expect(transitions.every(item => item.property === 'none' || item.duration.split(',').every(value => parseFloat(value) === 0))).toBe(true);
  const animations = await page.locator(layers).evaluateAll(elements => elements.reduce((sum, el) => sum + el.getAnimations({ subtree: true }).length, 0));
  expect(animations).toBe(0);
  await page.emulateMedia({ forcedColors: 'active' });
  for (const element of await page.locator(layers).all()) await expect(element).toHaveCSS('display', 'none');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  return { drawnLayers: transitions.length, runningLightAnimations: animations, forcedColorsHidden: true };
}

async function login(page, platform = false) {
  await page.goto(`${baseURL}${platform ? '/admin/login' : '/login'}`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId(platform ? 'demo-platform_admin' : 'demo-hospital_admin').click();
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('[data-system-cover]')).toBeVisible();
}

async function tableControls(page, size) {
  await page.goto(`${baseURL}/hospital/accounts`, { waitUntil: 'domcontentloaded' });
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Importe', exact: true })).toHaveCSS('text-align', 'right');
  const screenshot = await capture(page, size.name === 'desktop' ? 'hospital-accounts' : `hospital-accounts-${size.name}`);
  const responseFor = match => page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/accounts/page' && response.request().method() === 'GET' && match(url.searchParams);
  });
  let pending = responseFor(params => params.get('lane') === 'YELLOW' && !params.has('search'));
  await page.getByRole('button', { name: 'Por revisar', exact: true }).click();
  let response = await pending;
  expect(response.status()).toBe(200);
  const filtered = await response.json();
  expect(filtered.items.length).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Por revisar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(table.locator('tbody tr')).toHaveCount(filtered.items.length);
  const folio = filtered.items[0].folio;
  pending = responseFor(params => params.get('search') === folio);
  await page.getByRole('textbox', { name: 'Buscar cuentas', exact: true }).fill(folio);
  response = await pending;
  expect(response.status()).toBe(200);
  const found = await response.json();
  await expect(table.locator('tbody tr')).toHaveCount(found.items.length);
  await expect(table.getByRole('link', { name: new RegExp(folio) }).first()).toBeVisible();
  const region = page.getByRole('region', { name: 'Tabla de cuentas hospitalarias', exact: true });
  const widths = await region.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  if (size.isMobile && widths.scroll > widths.client) {
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  }
  const scrollLeft = await region.evaluate(el => el.scrollLeft);
  await region.evaluate(el => { el.scrollLeft = 0; });
  await table.getByRole('link', { name: `Abrir cuenta ${folio}`, exact: true }).click();
  await expect(page).toHaveURL(/\/hospital\/accounts\/[0-9a-z-]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return { screenshot, laneFilter: 'YELLOW', searchMatchesAPI: true, accountDetailOpened: true, region: { ...widths, observedScrollLeft: scrollLeft } };
}

try {
  await mkdir(output, { recursive: true });
  browser = await chromium.connectOverCDP(process.env.QA_CDP_URL || 'http://127.0.0.1:9430');
  report.browser = browser.version();
  for (const size of sizes) for (const phase of phases) await scenario(`landing-${phase.name}-${size.name}`, size, async page => {
    await page.clock.setFixedTime(instant(phase.hour));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await phaseReady(page, phase.name);
    const screenshot = await capture(page, phase.name === 'day' && size.name === 'desktop' ? 'landing-day' : `landing-${phase.name}-${size.name}`);
    const layout = await geometry(page, phase.name);
    const source = page.locator('[data-surface="landing"] [data-daylight-orb]');
    await expect(source).toBeVisible();
    if (size.isMobile) {
      await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Cerrar navegación', exact: true })).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('button', { name: 'Cerrar navegación', exact: true }).click();
    } else await page.getByRole('link', { name: 'Explorar plataforma', exact: true }).click({ trial: true });
    let preferences;
    let componentScreenshot;
    if (phase.name === 'day' && size.name === 'desktop') {
      preferences = await mediaPreferences(page);
      await page.locator('#plataforma').scrollIntoViewIfNeeded();
      componentScreenshot = await capture(page, 'landing-components');
    }
    return { ...layout, screenshot, ...(componentScreenshot ? { componentScreenshot } : {}), ...(preferences ? { preferences } : {}) };
  });

  for (const platform of [false, true]) for (const size of sizes) await scenario(`${platform ? 'atlas' : 'hospital'}-${size.name}`, size, async page => {
    await page.clock.setFixedTime(instant(14));
    await login(page, platform);
    await phaseReady(page, 'day', 'workspace');
    const screenshot = await capture(page, !platform && size.name === 'desktop' ? 'hospital-day' : `${platform ? 'atlas' : 'hospital'}-day-${size.name}`);
    const source = page.locator('[data-celestial]');
    await expect(source).toHaveAttribute('aria-hidden', 'true');
    const sourcePhases = [];
    for (const phase of phases) {
      await page.clock.setFixedTime(instant(phase.hour));
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await phaseReady(page, phase.name, 'workspace');
      await expect.poll(() => source.locator('[data-daylight-orb]').evaluate((el, name) => Number(getComputedStyle(el, name === 'night' ? '::after' : '::before').opacity), phase.name)).toBeGreaterThan(0);
      sourcePhases.push(await geometry(page, phase.name, true));
    }
    await page.clock.setFixedTime(instant(14));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    let mobileMenu;
    if (size.isMobile) {
      await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'Módulos del espacio', exact: true });
      mobileMenu = await drawer.evaluate(el => ({ clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }));
      const help = drawer.getByRole('button', { name: 'Centro de ayuda', exact: true });
      await help.scrollIntoViewIfNeeded();
      if (size.name === 'mobile-320') mobileMenu.screenshot = await capture(page, `${platform ? 'atlas' : 'hospital'}-menu-mobile-320`);
    }
    await page.getByRole('button', { name: 'Centro de ayuda', exact: true }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tu espacio, paso a paso' });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.viewport.width + 1);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    if (size.isMobile) {
      await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Módulos del espacio', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toHaveAttribute('aria-expanded', 'false');
      mobileMenu.reopenedAndClosed = true;
    }
    const preferences = size.name === 'desktop' ? await mediaPreferences(page, true) : undefined;
    let table;
    if (!platform) {
      const filter = page.getByRole('button', { name: /^Con hallazgos/ });
      await filter.click();
      await expect(filter).toHaveAttribute('aria-pressed', 'true');
      table = await tableControls(page, size);
    } else {
      const search = page.getByRole('textbox', { name: 'Buscar en hospitales conectados', exact: true });
      await search.fill('sin-coincidencias-v10');
      await expect(page.getByText('No hay hospitales con ese nombre', { exact: true })).toBeVisible();
      await search.clear();
      await expect(page.getByRole('region', { name: 'Capacidad por hospital', exact: true })).toBeVisible();
    }
    return { screenshot, sourcePhases, modalOpenAndEscapeClose: true, filtersReachable: true, ...(preferences ? { preferences } : {}), ...(table ? { table } : {}), ...(mobileMenu ? { mobileMenu } : {}) };
  });

  await scenario('automatic-light-change-without-reload', sizes[0], async page => {
    await page.clock.install({ time: instant(18, 58) });
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const layer = await phaseReady(page, 'sunset');
    const before = navigations;
    await page.clock.pauseAt(instant(18, 59, 59));
    await page.clock.runFor(1000);
    await expect(layer).toHaveAttribute('data-daylight', 'night');
    expect(navigations).toBe(before);
    return { before: '18:59:59 sunset', after: '19:00:00 night', additionalNavigations: 0 };
  });
} catch (error) {
  report.checks.push({ name: 'runner', status: 'block', message: sanitize(error.message) });
} finally {
  for (const context of owned) await context.close().catch(() => {});
  report.finishedAt = new Date().toISOString();
  report.totals = { pass: report.checks.filter(item => item.status === 'pass').length, fail: report.checks.filter(item => item.status === 'fail').length, block: report.checks.filter(item => item.status === 'block').length };
  report.filter = process.env.QA_FILTER || null;
  report.plannedChecks = plannedChecks;
  report.passed = plannedChecks > 0 && report.totals.pass === plannedChecks && report.totals.fail === 0 && report.totals.block === 0 && report.errors.length === 0;
  await writeFile(path.join(output, process.env.QA_REPORT_FILE || 'review.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, totals: report.totals, errors: report.errors }, null, 2));
  process.exit(report.passed ? 0 : 1);
}
