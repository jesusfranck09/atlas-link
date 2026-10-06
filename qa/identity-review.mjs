// V12 identity review. Run with QA_MODE=baseline before deployment; after needs coordinator's CDP handoff.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4430';
const mode = process.env.QA_MODE || 'after';
const outputLabel = process.env.QA_OUTPUT || (mode === 'baseline' ? 'before' : mode === 'preview' ? 'preview' : 'after');
const output = path.join(root, 'evidence/identity-v12', outputLabel);
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER) : null;
const sizes = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'tablet-1024', viewport: { width: 1024, height: 900 }, hasTouch: true },
  { name: 'mobile-320', viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true },
];
const identities = [
  { name: 'hospital', label: 'Portal hospitalario', demo: 'hospital_admin', role: 'HOSPITAL_ADMIN', login: '/login', path: '/hospital' },
  { name: 'control', label: 'Consola Atlas', demo: 'platform_admin', role: 'PLATFORM_ADMIN', login: '/admin/login', path: '/admin' },
  { name: 'insurer', label: 'Portal aseguradora', demo: 'insurer_demo', role: 'INSURER_DEMO', login: mode === 'baseline' ? '/login' : '/insurer/login', path: '/hospital' },
];
const hospitalModules = [
  { path: '/hospital', context: 'Vista general' },
  { path: '/hospital/accounts', context: 'Cuentas hospitalarias', heading: 'Cuentas hospitalarias' },
  { path: '/hospital/review', context: 'Bandeja de revisión', heading: 'Bandeja de revisión' },
  { path: '/hospital/import', context: 'Cargar cuentas', heading: 'Cargar cuentas' },
  { path: '/hospital/agreements', context: 'Convenios', heading: 'Convenios y tabuladores' },
  { path: '/hospital/reports', context: 'Reportes', heading: 'Reportes' },
  { path: '/hospital/users', context: 'Equipo y accesos', heading: 'Equipo y accesos' },
  { path: '/hospital/audit', context: 'Bitácora de actividad', heading: 'Bitácora' },
];
const controlModules = [
  { path: '/admin', context: 'Vista general' },
  { path: '/admin/tenants', context: 'Hospitales' },
  { path: '/admin/licenses', context: 'Licencias y capacidad' },
  { path: '/admin/leads', context: 'Solicitudes comerciales' },
  { path: '/admin/users', context: 'Equipo Atlas', heading: 'Equipo Atlas' },
  { path: '/admin/audit', context: 'Bitácora de actividad', heading: 'Bitácora' },
];
const report = {
  startedAt: new Date().toISOString(), mode, baseURL, outputLabel,
  filter: process.env.QA_FILTER || null,
  deploymentImage: process.env.QA_DEPLOYMENT_IMAGE || null,
  buildConfig: process.env.QA_BUILD_CONFIG || null,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workingTree: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean),
  environment: 'Local Docker Next.js production build, actual Java/Spring APIs and PostgreSQL demo data; Chrome on macOS via CDP. 390/320 and tablet dimensions are emulated, not physical mobile devices.',
  mutations: 'Authentication/session audit only. No business-data writes, commercial forms, email, payments or API mocks.',
  scope: mode === 'baseline' ? 'Fresh V11 landing and three authenticated shells at 14:00 local time, for V12 comparison.' : mode === 'preview' ? 'Early V12 desktop composition screenshots for the design reviewers. Not the complete regression run.' : 'Distinct shell identity/context on every module; real demo autofill/authentication; navigation, read-only insurer, bounded 3D/fallback and landing interactions.',
  checks: [], routes: [], errors: [],
};
const sanitize = value => String(value).replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]').replace(/AtlasDemo\d+!/g, '[DEMO_PASSWORD]');
const owned = new Set();
let browser;
let planned = 0;

async function scenario(name, size, action) {
  if (filter && !filter.test(name)) return;
  planned++;
  const { name: ignored, ...options } = size;
  const context = await browser.newContext({ baseURL, locale: 'es-MX', timezoneId: 'America/Mexico_City', ...options });
  owned.add(context);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.errors.push({ name, kind: 'pageerror', message: sanitize(error.message) }));
  page.on('console', event => { if (event.type() === 'error') report.errors.push({ name, kind: 'console', message: sanitize(event.text()) }); });
  page.on('response', response => { if (response.url().startsWith(baseURL) && response.status() >= 400) report.errors.push({ name, kind: 'http', path: new URL(response.url()).pathname, status: response.status() }); });
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (request.url().startsWith(baseURL) && pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !['/api/auth/login', '/api/auth/logout'].includes(pathname)) report.errors.push({ name, kind: 'unexpected-business-write', method: request.method(), path: pathname });
  });
  try {
    await page.clock.setFixedTime(new Date('2026-09-24T14:00:00-06:00'));
    report.checks.push({ name, status: 'pass', ...await action(page) });
    console.log(`PASS ${name}`);
  } catch (error) {
    const screenshot = `${name}-failure.png`;
    await page.screenshot({ path: path.join(output, screenshot), animations: 'disabled' }).catch(() => {});
    report.checks.push({ name, status: 'fail', route: new URL(page.url()).pathname, message: sanitize(error.message), stack: sanitize(error.stack || ''), screenshot });
    console.log(`FAIL ${name}: ${sanitize(error.message)}`);
  } finally { await context.close(); owned.delete(context); }
}

async function ready(page) {
  await page.evaluate(() => document.fonts.ready);
  for (const chart of await page.locator('[data-analytics-sculpture]').all()) {
    const bounds = await chart.boundingBox();
    if (bounds && bounds.y < page.viewportSize().height && bounds.y + bounds.height > 0) await expect(chart).not.toHaveAttribute('data-renderer', 'loading');
  }
  const eligible = await page.evaluate(() => matchMedia('(min-width: 900px) and (pointer: fine)').matches && !matchMedia('(forced-colors: active)').matches);
  for (const sculpture of await page.locator('[data-system-sculpture]').all()) {
    const bounds = await sculpture.boundingBox();
    if (bounds && bounds.y < page.viewportSize().height && bounds.y + bounds.height > 0) await expect(sculpture).toHaveAttribute('data-renderer', eligible ? 'webgl' : 'svg');
  }
}

async function screenshot(page, name) {
  await ready(page);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(output, file), animations: 'disabled', caret: 'hide' });
  return `evidence/identity-v12/${outputLabel}/${file}`;
}

async function login(page, identity, captureName) {
  await page.goto(identity.login, { waitUntil: 'domcontentloaded' });
  if (mode !== 'baseline') await expect(page.locator('[data-login-system]')).toHaveAttribute('data-system', identity.name);
  await expect(page.getByTestId(`demo-${identity.demo}`)).toBeVisible();
  if (mode !== 'baseline' && identity.name === 'insurer') await expect(page.locator('[data-login-demos] [data-testid^="demo-"]')).toHaveCount(1);
  const loginEvidence = captureName ? {
    screenshot: await screenshot(page, `${captureName}-login`),
    image: await page.locator('[data-login-photo] img').getAttribute('src'),
    axe: await accessibility(page),
  } : undefined;
  let loginRequests = 0;
  const observeLogin = request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/login') loginRequests++; };
  page.on('request', observeLogin);
  await page.getByTestId(`demo-${identity.demo}`).click();
  expect(new URL(page.url()).pathname).toBe(identity.login);
  await expect(page.locator('input[type="email"]')).not.toHaveValue('');
  await expect(page.locator('input[type="password"]')).not.toHaveValue('');
  expect(loginRequests, 'A demo selection only fills the form; authentication remains an explicit action').toBe(0);
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`${identity.path}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
  const user = await page.evaluate(() => {
    const user = JSON.parse(sessionStorage.getItem('atlas.session') || '{}').user;
    return { role: user?.role, organization: user?.tenantName || null };
  });
  expect(user.role).toBe(identity.role);
  expect(loginRequests).toBe(1);
  page.off('request', observeLogin);
  return { ...user, autofillWithoutSubmit: true, explicitLoginStatus: 200, ...(loginEvidence ? { loginEvidence } : {}) };
}

async function geometry(page) {
  const value = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(value.document).toBeLessThanOrEqual(value.viewport + 1);
  return value;
}

async function accessibility(page, selectors = []) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  for (const selector of selectors) builder = builder.include(selector);
  const result = await builder.analyze();
  const violations = result.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
  expect(violations).toEqual([]);
  return { violations, incomplete: result.incomplete.map(item => ({ id: item.id, nodes: item.nodes.length })) };
}

async function contextAt(page, identity, module, organization) {
  await expect(page.locator('[data-workspace]')).toHaveAttribute('data-system', identity.name);
  const context = page.locator('[data-system-context]');
  await expect(context).toBeVisible();
  const breadcrumb = context.getByRole('navigation', { name: 'Ubicación actual', exact: true });
  await expect(breadcrumb).toBeVisible();
  await expect(breadcrumb).toContainText(identity.label);
  await expect(breadcrumb).toContainText(identity.name === 'control' ? 'Atlas Link' : organization);
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(module.context);
  if (module.context === 'Detalle de cuenta') await expect(breadcrumb.getByRole('link', { name: 'Cuentas hospitalarias', exact: true })).toHaveAttribute('href', '/hospital/accounts');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveCount(1);
  await expect(heading).toBeVisible();
  if (module.heading) await expect(heading).toHaveText(module.heading);
  return { system: identity.name, text: (await breadcrumb.innerText()).replace(/\s+/g, ' ').trim(), heading: await heading.innerText() };
}

async function openNavigation(page, size) {
  if (size.viewport.width <= 760) {
    await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Módulos del espacio', exact: true })).toBeVisible();
  }
  return page.getByRole('navigation', { name: 'Navegación del espacio', exact: true });
}

async function visitModule(page, identity, module, size, organization) {
  if (new URL(page.url()).pathname !== module.path) {
    const navigation = await openNavigation(page, size);
    await navigation.getByRole('link', { name: module.context, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${module.path}$`));
  }
  await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
  const location = await contextAt(page, identity, module, organization);
  const label = `${identity.name}-${module.path.split('/').pop()}-${size.name}`;
  const result = { route: module.path, identity: identity.name, viewport: size.name, location, dimensions: await geometry(page), screenshot: await screenshot(page, label), axe: await accessibility(page) };
  report.routes.push(result);
  return result;
}

async function menuAndHelp(page, size) {
  let keyboardTrap;
  if (size.viewport.width <= 760) {
    await openNavigation(page, size);
    const dialog = page.getByRole('dialog', { name: 'Módulos del espacio', exact: true });
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    const controls = dialog.locator('a[href], button:not([disabled]), input:not([disabled])').filter({ visible: true });
    await controls.last().focus();
    await page.keyboard.press('Tab');
    await expect(controls.first()).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(controls.last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toBeFocused();
    await openNavigation(page, size);
    await page.getByRole('dialog', { name: 'Módulos del espacio', exact: true }).getByRole('button', { name: 'Centro de ayuda', exact: true }).click();
    keyboardTrap = 'forward/backward Tab stays in drawer; Escape restores trigger focus';
  } else await page.getByRole('button', { name: 'Centro de ayuda', exact: true }).filter({ visible: true }).click();
  const help = page.getByRole('dialog', { name: 'Tu espacio, paso a paso', exact: true });
  await expect(help).toBeVisible();
  await help.getByRole('button', { name: 'Entendido', exact: true }).click();
  await expect(help).toHaveCount(0);
  return { helpOpenedAndClosed: true, ...(keyboardTrap ? { keyboardTrap } : {}) };
}

async function accountFiltersAndDetail(page, identity, size, organization) {
  const pending = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/accounts/page' && response.request().method() === 'GET' && url.searchParams.get('lane') === 'YELLOW';
  });
  await page.getByRole('button', { name: 'Por revisar', exact: true }).click();
  const filtered = await pending;
  expect(filtered.status()).toBe(200);
  const accounts = await filtered.json();
  expect(accounts.items.length).toBeGreaterThan(0);
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(accounts.items.length);
  const first = accounts.items[0];
  const searched = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/accounts/page' && response.request().method() === 'GET' && url.searchParams.get('search') === first.folio;
  });
  await page.getByRole('textbox', { name: 'Buscar cuentas', exact: true }).fill(first.folio);
  const searchResponse = await searched;
  expect(searchResponse.status()).toBe(200);
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount((await searchResponse.json()).items.length);
  await page.getByRole('link', { name: `Abrir cuenta ${first.folio}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/hospital/accounts/${first.id}$`));
  const location = await contextAt(page, identity, { context: 'Detalle de cuenta', heading: first.folio }, organization);
  const details = { route: `/hospital/accounts/${first.id}`, identity: identity.name, viewport: size.name, location, dimensions: await geometry(page), screenshot: await screenshot(page, `${identity.name}-detail-${size.name}`), axe: await accessibility(page) };
  report.routes.push(details);
  if (identity.name === 'insurer') {
    for (const label of [/Tomar revisión/, /Reevaluar/, /Preparar para envío/, /Registrar envío/, /Registrar respuesta/, /Corregir /, /Exportar Excel/, /Descargar PDF/]) await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  return { filterMatchesRealAPI: true, searchMatchesRealAPI: true, detailBreadcrumb: location, insurerMutationsAbsent: identity.name === 'insurer' };
}

async function insurerRestrictions(page) {
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('atlas.session') || '{}').token);
  const denied = [];
  for (const path of ['/api/accounts/template', '/api/accounts/report', '/api/licenses']) {
    const response = await page.request.get(path, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status(), `Read-only insurer may not access ${path}`).toBe(403);
    denied.push({ path, status: response.status() });
  }
  return { denied, limit: 'Read-only UI controls and forbidden GET capabilities checked. No mutating endpoint probed; this is not a complete permission/security audit.' };
}

async function landingInteractions(page, size) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Cada cuenta,\s*en perspectiva\./);
  const hero = await screenshot(page, `landing-hero-${size.name}`);
  const showcase = page.getByRole('region', { name: 'Sistemas Atlas Link', exact: true });
  await expect(showcase).toHaveAttribute('aria-roledescription', 'carrusel');
  await showcase.scrollIntoViewIfNeeded();
  const track = showcase.locator('[data-showcase-track]');
  const cards = [
    { name: 'hospital', link: 'Entrar al portal hospitalario', path: '/login' },
    { name: 'control', link: 'Entrar a la consola Atlas', path: '/admin/login' },
    { name: 'insurer', link: 'Entrar a la aseguradora demo', path: '/insurer/login' },
  ];
  const flips = [];
  for (const item of cards) {
    const card = showcase.locator(`[data-space="${item.name}"]`);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute('data-reveal-state', 'visible');
    await expect(card).toHaveAttribute('data-flipped', 'false');
    const trigger = card.getByRole('button', { name: /^Ver módulos de / });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveAttribute('data-flipped', 'true');
    const enter = card.getByRole('link', { name: item.link, exact: true });
    await expect(enter).toBeVisible();
    await expect(enter).toHaveAttribute('href', item.path);
    const inactive = await card.locator('[inert][aria-hidden="true"]').count();
    expect(inactive).toBeGreaterThan(0);
    const reverse = card.getByRole('button', { name: /^Volver a portada de / });
    await reverse.focus();
    await page.keyboard.press('Space');
    await expect(card).toHaveAttribute('data-flipped', 'false');
    await expect(card.getByRole('link', { name: item.link, exact: true })).toBeVisible();
    await expect(card.getByRole('heading', { level: 3 })).toHaveCount(1);
    flips.push({ system: item.name, keyboardToggle: true, inactiveFaceExcluded: true, destinationAlwaysAvailable: true, destination: item.path });
  }
  const overflow = await track.evaluate(el => ({ clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft }));
  const scrollChecks = [];
  if (overflow.scrollWidth > overflow.clientWidth + 1) {
    const previous = showcase.getByRole('button', { name: 'Anterior sistema', exact: true });
    // Let each native smooth-scroll/snap finish. Capture the actual user result,
    // never an intermediate pixel nor a programmatic instant reposition.
    for (let attempt = 0; attempt < cards.length && await previous.isEnabled(); attempt++) {
      await previous.click();
      await settledTrack(track);
    }
    await expect(previous).toBeDisabled();
    expect(await track.evaluate(el => el.scrollLeft)).toBeLessThanOrEqual(1);
    await track.focus();
    await page.keyboard.press('ArrowRight');
    const keyboardRight = await settledTrack(track);
    expect(keyboardRight).toBeGreaterThan(0);
    scrollChecks.push({ action: 'ArrowRight', scrollLeft: keyboardRight });
    await page.keyboard.press('ArrowLeft');
    expect(await settledTrack(track)).toBeLessThanOrEqual(1);
    await expect(previous).toBeDisabled();
    await showcase.getByRole('button', { name: 'Siguiente sistema', exact: true }).click();
    const buttonRight = await settledTrack(track);
    expect(buttonRight).toBeGreaterThan(0);
    scrollChecks.push({ action: 'Next button', scrollLeft: buttonRight });
    await previous.click();
    const firstCardRestingPosition = await settledTrack(track);
    expect(firstCardRestingPosition).toBeLessThanOrEqual(1);
    await expect(previous).toBeDisabled();
    scrollChecks.push({ action: 'Previous button to first card', scrollLeft: firstCardRestingPosition, previousDisabled: true });
  }
  const visibleStates = await page.locator('[data-reveal-state]').evaluateAll(elements => elements.map(el => ({ tag: el.tagName, state: el.dataset.revealState, inView: el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight })));
  // Adjacent sections may legitimately remain staged until their intersection
  // threshold is reached. Assert the heading/cards actually inspected here.
  await expect(showcase.locator('[data-reveal-state]')).toHaveCount(4);
  await expect.poll(() => showcase.locator('[data-reveal-state]').evaluateAll(elements => elements.every(el => el.dataset.revealState === 'visible'))).toBe(true);
  const cardScreenshot = await screenshot(page, `landing-showcase-${size.name}`);
  const axe = await accessibility(page, ['[data-hero-intro]', '[data-system-showcase]']);
  const dimensions = await geometry(page);
  if (size.viewport.width <= 760) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cerrar navegación', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: 'Cerrar navegación', exact: true }).click();
  }
  return { hero, cardScreenshot, flips, scrollChecks, reveal: visibleStates, dimensions, axe };
}

async function settledTrack(track) {
  let previous = -1;
  let stableSamples = 0;
  await expect.poll(async () => {
    const current = await track.evaluate(el => el.scrollLeft);
    stableSamples = Math.abs(current - previous) < .1 ? stableSamples + 1 : 0;
    previous = current;
    return stableSamples;
  }, { timeout: 5000, intervals: [80], message: 'Wait for native carousel smooth-scroll and mandatory snap to settle' }).toBeGreaterThanOrEqual(3);
  return previous;
}

async function sculptureState(page, identity, size) {
  const cover = page.locator(`[data-system-cover="${identity.name}"]`);
  await expect(cover).toBeVisible();
  const sculpture = cover.locator(`[data-system-sculpture="${identity.name}"]`);
  await expect(sculpture).toHaveCount(1);
  await expect(sculpture).toHaveAttribute('aria-hidden', 'true');
  await ready(page);
  const eligible = await page.evaluate(() => matchMedia('(min-width: 900px) and (pointer: fine)').matches);
  await expect(sculpture).toHaveAttribute('data-renderer', eligible ? 'webgl' : 'svg');
  if (eligible) await expect(sculpture.locator('canvas')).toBeVisible();
  else {
    await expect(sculpture.locator('svg')).toBeVisible();
    await expect(sculpture.locator('canvas')).toHaveCount(0);
  }
  const state = await sculpture.evaluate(el => ({ renderer: el.dataset.renderer, motion: el.dataset.motion || null, frames: Number(el.dataset.frames || 0), calls: Number(el.dataset.drawCalls || 0), triangles: Number(el.dataset.triangles || 0), geometries: Number(el.dataset.geometries || 0), textures: Number(el.dataset.textures || 0), pixelRatio: Number(el.dataset.pixelRatio || 0) }));
  return { identity: identity.name, viewport: size.name, eligibleForWebGL: eligible, ...state };
}

async function framesSettle(sculpture) {
  let last = -1;
  let stableSince = 0;
  await expect.poll(async () => {
    const current = Number(await sculpture.getAttribute('data-frames'));
    const now = performance.now();
    if (current !== last) { last = current; stableSince = now; }
    return now - stableSince;
  }, { timeout: 5000, intervals: [100], message: 'Renderer must remain idle beyond its documented 900 ms settling window' }).toBeGreaterThanOrEqual(1000);
  return last;
}

async function sculptureEffects(page, identity) {
  const sculpture = page.locator(`[data-system-sculpture="${identity.name}"]`);
  await ready(page);
  await expect(sculpture).toHaveAttribute('data-renderer', 'webgl');
  await page.mouse.move(1, 1);
  const idle = await framesSettle(sculpture);
  const bounds = await sculpture.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .35, { steps: 4 });
  await expect.poll(async () => Number(await sculpture.getAttribute('data-frames'))).toBeGreaterThan(idle);
  const pointerSettled = await framesSettle(sculpture);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(sculpture).toHaveAttribute('data-motion', 'reduced');
  const reducedBefore = await framesSettle(sculpture);
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + bounds.height * .8, { steps: 5 });
  const reducedAfter = await framesSettle(sculpture);
  expect(reducedAfter).toBe(reducedBefore);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => sculpture.evaluate(el => el.getBoundingClientRect().bottom <= 0 || el.getBoundingClientRect().top >= innerHeight)).toBe(true);
  // Let the browser deliver IntersectionObserver/resize callbacks before measuring pause.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const offscreenBefore = Number(await sculpture.getAttribute('data-frames'));
  const offscreenAfter = await framesSettle(sculpture);
  expect(offscreenAfter).toBe(offscreenBefore);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await ready(page);
  const beforeHidden = await framesSettle(sculpture);
  const foreground = await page.context().newPage();
  await foreground.goto('about:blank');
  await foreground.bringToFront();
  let hidden;
  try {
    hidden = await page.evaluate(() => document.hidden);
    if (hidden) expect(await framesSettle(sculpture)).toBe(beforeHidden);
  } finally { await page.bringToFront(); await foreground.close(); }
  let contextRecovery;
  if (identity.name === 'control') {
    const lost = await sculpture.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      window.__qaLostContext = extension;
      extension.loseContext();
      return true;
    });
    expect(lost).toBe(true);
    await expect(sculpture).toHaveAttribute('data-renderer', 'svg');
    await expect(sculpture.locator('svg')).toBeVisible();
    await page.evaluate(() => window.__qaLostContext.restoreContext());
    await expect(sculpture).toHaveAttribute('data-renderer', 'webgl');
    await page.evaluate(() => { delete window.__qaLostContext; });
    contextRecovery = 'WebGL context deliberately lost and restored; SVG remained available and real canvas recovered';
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(sculpture).toHaveCSS('display', 'none');
  await expect(sculpture.locator('canvas')).toHaveCount(0);
  await page.emulateMedia({ forcedColors: 'none' });
  await ready(page);
  return { idle, pointerSettled, reducedBefore, reducedAfter, offscreenBefore, offscreenAfter, hiddenTab: hidden ? 'Actual tab hidden; draw counter stayed stable' : 'Chrome CDP did not expose an actual hidden state; not asserted', forcedColorsRemovesCanvas: true, ...(contextRecovery ? { contextRecovery } : {}) };
}

async function landingPreferences(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('[data-reveal-state]').evaluateAll(elements => elements.every(el => el.dataset.revealState === 'visible'))).toBe(true);
  const animations = await page.locator('[data-system-showcase]').evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length);
  expect(animations).toBe(0);
  const reducedScreenshot = await screenshot(page, 'landing-reduced-motion');
  await page.emulateMedia({ forcedColors: 'active' });
  for (const layer of await page.locator('[data-daylight], [data-daylight-overlay]').all()) await expect(layer).toHaveCSS('display', 'none');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  return { revealsVisibleInReducedMotion: true, runningShowcaseAnimations: animations, reducedScreenshot, forcedColorsRetainsContent: true };
}

async function prismaticText(page) {
  const effects = page.locator('[data-prismatic-text]');
  await expect(effects).toHaveCount(2);
  await effects.evaluateAll(elements => {
    window.__qaPrismEvents = [];
    elements.forEach(el => ['pointerenter', 'pointermove', 'pointerleave'].forEach(name => el.addEventListener(name, event => {
      window.__qaPrismEvents.push({ name, time: performance.now(), pointer: event.pointerType, x: event.clientX, y: event.clientY, text: el.textContent, motion: el.dataset.motion, state: el.dataset.prismState, engaged: el.dataset.engaged });
    })));
  });
  const results = [];
  for (const effect of await effects.all()) {
    await effect.scrollIntoViewIfNeeded();
    await expect(effect).toBeVisible();
    const initial = await effect.evaluate(el => ({ text: el.textContent, htmlText: el.innerText, color: getComputedStyle(el).color, opacity: getComputedStyle(el).opacity, animations: el.getAnimations({ subtree: true }).map(animation => ({ iterations: animation.effect?.getComputedTiming().iterations, duration: animation.effect?.getComputedTiming().duration })) }));
    expect(initial.text?.trim().length).toBeGreaterThan(0);
    expect(initial.htmlText).toBe(initial.text);
    expect(Number(initial.opacity)).toBeGreaterThan(0);
    expect(initial.animations.every(animation => animation.iterations !== Infinity)).toBe(true);
    expect(initial.animations.every(animation => Number(animation.duration) <= 1800)).toBe(true);
    await expect.poll(() => effect.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), { timeout: 4000, intervals: [100, 200], message: 'Typography effect must finish; product contract max1.8s' }).toBe(0);
    await expect(effect).toHaveAttribute('data-prism-state', 'idle');
    const box = await effect.boundingBox();
    const hit = await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return { x, y, tag: element?.tagName, className: element?.className, text: element?.textContent, isPrismatic: Boolean(element?.hasAttribute('data-prismatic-text')), hidden: document.hidden, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, forcedColors: matchMedia('(forced-colors: active)').matches };
    }, { x: box.x + box.width * .2, y: box.y + box.height / 2 });
    expect(hit.isPrismatic, 'The hover probe must target the visible text, not an overlay').toBe(true);
    await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2);
    try { await expect(effect).toHaveAttribute('data-engaged', 'true'); }
    finally {
      const state = await effect.evaluate(el => ({ motion: el.dataset.motion, state: el.dataset.prismState, engaged: el.dataset.engaged, position: el.style.getPropertyValue('--prism-position'), fontSize: getComputedStyle(el).fontSize, box: el.getBoundingClientRect().toJSON() }));
      await writeFile(path.join(output, `prismatic-pointer-${results.length}.json`), JSON.stringify({ hit, state, events: await page.evaluate(() => window.__qaPrismEvents) }, null, 2));
    }
    await expect.poll(() => effect.evaluate(el => el.style.getPropertyValue('--prism-position'))).not.toBe('');
    const left = await effect.evaluate(el => el.style.getPropertyValue('--prism-position'));
    await page.mouse.move(box.x + box.width * .8, box.y + box.height / 2);
    await expect.poll(() => effect.evaluate(el => el.style.getPropertyValue('--prism-position'))).not.toBe(left);
    await page.mouse.move(1, 1);
    await expect(effect).toHaveAttribute('data-engaged', 'false');
    await expect.poll(() => effect.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
    results.push({ ...initial, pointerChangesFinish: true, pointerLeaveReturnsToIdle: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await effects.evaluateAll(elements => elements.map(el => ({ text: el.textContent, opacity: getComputedStyle(el).opacity, running: el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length })));
  expect(reduced.every(item => Number(item.opacity) > 0 && item.running === 0)).toBe(true);
  await page.emulateMedia({ forcedColors: 'active' });
  for (const effect of await effects.all()) await expect(effect).toBeVisible();
  const forcedColors = await effects.evaluateAll(elements => elements.map(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundImage, textFill: getComputedStyle(el).webkitTextFillColor })));
  expect(forcedColors.every(item => item.color !== 'rgba(0, 0, 0, 0)' && item.textFill !== 'rgba(0, 0, 0, 0)')).toBe(true);
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  return { results, reduced, forcedColors, limits: 'DOM readability, finite browser animations and preferences; no aesthetic acceptance or physical-device performance claim.' };
}

async function prismaticReentry(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  const effect = page.locator('[data-prismatic-text]').first();
  await expect(effect).toHaveAttribute('data-motion', 'full');
  await expect(effect).toHaveAttribute('data-prism-state', 'idle');
  const bounds = await effect.boundingBox();
  const x = bounds.x + bounds.width * .2;
  const y = bounds.y + bounds.height / 2;
  const cycles = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.mouse.move(1, 1);
    // This rapid viewport jump deliberately exercises the documented timing bug;
    // it is not used to position or improve any carousel screenshot.
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await expect(effect).toHaveAttribute('data-prism-state', 'paused');
    expect(await effect.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(effect).toHaveAttribute('data-motion', 'reduced');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(effect).toHaveAttribute('data-motion', 'full');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    // No extra protocol round trip between scrolling and the real pointer move:
    // pointerenter may precede IntersectionObserver's next callback.
    await page.mouse.move(x, y);
    await expect(effect, 'A real pointer inside a visible title must engage even before the observer catches up').toHaveAttribute('data-engaged', 'true');
    const state = await effect.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { engaged: el.dataset.engaged, motion: el.dataset.motion, hit: document.elementFromPoint(r.x + r.width * .2, r.y + r.height / 2) === el, hidden: document.hidden, text: el.textContent };
    });
    expect(state.hit).toBe(true);
    expect(state.hidden).toBe(false);
    cycles.push({ cycle, ...state });
  }
  // A preference toggle with the pointer still inside must also recover on
  // pointermove; there is deliberately no new pointerenter in this branch.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(effect).toHaveAttribute('data-engaged', 'false');
  await page.mouse.move(bounds.x + bounds.width * .8, y);
  await expect(effect).toHaveAttribute('data-engaged', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(bounds.x + bounds.width * .4, y);
  await expect(effect).toHaveAttribute('data-engaged', 'true');
  await page.mouse.move(1, 1);
  await expect(effect).toHaveAttribute('data-engaged', 'false');
  await expect.poll(() => effect.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
  return { cycles, recoversOnMoveAfterPreferenceToggle: true, noRunningAnimationsAtEnd: true, regressionEvidence: 'evidence/identity-v12/diagnostic-native/prismatic-timing.json' };
}

try {
  await mkdir(output, { recursive: true });
  browser = await chromium.connectOverCDP(process.env.QA_CDP_URL || 'http://127.0.0.1:9430');
  report.browser = browser.version();
  if (mode === 'preview') {
    for (const identity of identities) await scenario(`${identity.name}-desktop-preview`, sizes[0], async page => {
      await login(page, identity);
      return { dimensions: await geometry(page), sculpture: await sculptureState(page, identity, sizes[0]), screenshot: await screenshot(page, `${identity.name}-desktop`) };
    });
    await scenario('landing-desktop-preview', sizes[0], async page => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const hero = await screenshot(page, 'landing-desktop');
      await page.locator('[data-system-showcase]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-system-showcase] [data-reveal-state="visible"]').first()).toBeVisible();
      const showcase = await screenshot(page, 'landing-showcase-desktop');
      return { hero, showcase, dimensions: await geometry(page) };
    });
  } else if (mode === 'baseline') {
    for (const size of sizes.slice(0, 2)) {
      await scenario(`landing-${size.name}`, size, async page => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Cada cuenta,\s*en perspectiva\./);
        return { dimensions: await geometry(page), screenshot: await screenshot(page, `landing-${size.name}`) };
      });
      for (const identity of identities) await scenario(`${identity.name}-${size.name}`, size, async page => {
        await login(page, identity);
        return { route: new URL(page.url()).pathname, dimensions: await geometry(page), screenshot: await screenshot(page, `${identity.name}-${size.name}`) };
      });
    }
  } else {
    for (const size of sizes) await scenario(`landing-${size.name}`, size, async page => {
      const interactions = await landingInteractions(page, size);
      const preferences = size.name === 'desktop' ? await landingPreferences(page) : undefined;
      const textEffect = size.name === 'desktop' ? await prismaticText(page) : undefined;
      return { ...interactions, ...(preferences ? { preferences } : {}), ...(textEffect ? { textEffect } : {}) };
    });
    for (const size of sizes) for (const identity of identities) await scenario(`${identity.name}-${size.name}`, size, async page => {
      const authentication = await login(page, identity, `${identity.name}-${size.name}`);
      const sculpture = await sculptureState(page, identity, size);
      const composition = await page.evaluate(() => {
        const rect = selector => {
          const el = document.querySelector(selector);
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
        };
        return { nav: rect('#workspace-navigation'), content: rect('#workspace-content'), accent: getComputedStyle(document.querySelector('[data-workspace]')).getPropertyValue('--accent').trim(), coverHeight: rect('[data-system-cover]').height };
      });
      if (identity.name === 'control' && size.viewport.width >= 1180) expect(composition.nav.height).toBeGreaterThan(composition.nav.width);
      if (identity.name === 'hospital' && size.viewport.width > 760) expect(composition.nav.width).toBeGreaterThan(composition.nav.height);
      let desktopDensity;
      if (identity.name === 'hospital' && size.name === 'desktop') {
        await page.setViewportSize({ width: 1440, height: 900 });
        desktopDensity = await page.getByRole('region', { name: 'Tabla de cuentas hospitalarias', exact: true }).locator('table tbody tr').evaluateAll(rows => ({ viewportHeight: innerHeight, rows: rows.map(row => ({ top: row.getBoundingClientRect().top, bottom: row.getBoundingClientRect().bottom })), visibleRows: rows.filter(row => row.getBoundingClientRect().top >= 0 && row.getBoundingClientRect().bottom <= innerHeight).length }));
        await screenshot(page, 'hospital-overview-1440x900');
        expect(desktopDensity.rows).toHaveLength(6);
        expect(desktopDensity.visibleRows, 'Preserve six complete recent-account rows at1440×900').toBe(6);
        await page.setViewportSize(size.viewport);
      }
      const allModules = identity.name === 'control' ? controlModules : identity.name === 'insurer' ? hospitalModules.slice(0, 2) : hospitalModules;
      const fullRoutes = ['desktop', 'mobile-390'].includes(size.name);
      const modules = fullRoutes ? allModules : allModules.slice(0, 2);
      const visited = [];
      let accountControls;
      for (const module of modules) {
        const result = await visitModule(page, identity, module, size, authentication.organization);
        visited.push(result.route);
        if (module.path === '/hospital/accounts') accountControls = await accountFiltersAndDetail(page, identity, size, authentication.organization);
        if (module.path.endsWith('/users') && fullRoutes) {
          await page.getByRole('button', { name: 'Agregar persona', exact: true }).click();
          const dialog = page.getByRole('dialog', { name: 'Agregar persona', exact: true });
          await expect(dialog).toBeVisible();
          await dialog.getByRole('textbox', { name: /^Nombre/ }).fill('Prueba visual sin guardar');
          await expect(dialog.getByRole('textbox', { name: /^Nombre/ })).toHaveValue('Prueba visual sin guardar');
          await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
          await expect(dialog).toHaveCount(0);
        }
      }
      const controls = await menuAndHelp(page, size);
      let permissions;
      if (identity.name === 'insurer') {
        const navigation = await openNavigation(page, size);
        await expect(navigation.getByRole('link')).toHaveCount(2);
        await expect(navigation.getByRole('link', { name: 'Cargar cuentas', exact: true })).toHaveCount(0);
        if (size.viewport.width <= 760) await page.keyboard.press('Escape');
        if (size.name === 'desktop') permissions = await insurerRestrictions(page);
      }
      if (size.viewport.width <= 760) await openNavigation(page, size);
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).filter({ visible: true }).click();
      await expect(page).toHaveURL(new RegExp(`${identity.login}$`));
      await expect(page.locator('[data-login-system]')).toHaveAttribute('data-system', identity.name);
      return { authentication, sculpture, composition, visited, controls, logoutReturnsToOwnSystem: true, ...(desktopDensity ? { desktopDensity } : {}), ...(accountControls ? { accountControls } : {}), ...(permissions ? { permissions } : {}) };
    });
    for (const identity of identities) await scenario(`${identity.name}-effects-desktop`, sizes[0], async page => {
      await login(page, identity);
      const effects = await sculptureEffects(page, identity);
      return { effects };
    });
    await scenario('prismatic-reentry-desktop', sizes[0], prismaticReentry);
  }
} catch (error) {
  report.errors.push({ kind: 'runner', message: sanitize(error.stack || error.message) });
} finally {
  for (const context of owned) await context.close();
  report.finishedAt = new Date().toISOString();
  report.planned = planned;
  report.passed = planned > 0 && report.checks.length === planned && report.checks.every(check => check.status === 'pass') && report.errors.length === 0;
  await writeFile(path.join(output, 'review.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, routes: report.routes.length, failures: report.checks.filter(check => check.status !== 'pass'), errors: report.errors, contextsClosed: true }, null, 2));
  // Keep shared Chrome running. Only this script and its own closed contexts end.
  process.exit(report.passed ? 0 : 1);
}
