import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const label = process.argv[2] || 'iteration-1';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid review label');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4430';
const output = path.resolve('../evidence/redesign', label);
await mkdir(output, { recursive: true });
const report = { label, startedAt: new Date().toISOString(), baseURL, views: [], errors: [], interactionChecks: [], scope: 'Local packaged UI; synthetic data; authentication and read-only navigation' };
const browser = await chromium.connectOverCDP('http://127.0.0.1:9430');
report.browserVersion = browser.version();

async function inspect(page, name) {
  await expect(page.locator('h1').first()).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
  const max = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(max, 15000); y += 700) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(180);
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, innerWidth, visualWidth: visualViewport?.width, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  dimensions.viewport = page.viewportSize().width;
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled', caret: 'initial' });
  if (name.endsWith('landing') || name.endsWith('hospital') || name.endsWith('admin')) await page.screenshot({ path: path.join(output, `${name}-viewport.png`), fullPage: false, animations: 'disabled', caret: 'initial' });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const violations = axe.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
  report.views.push({ name, route: new URL(page.url()).pathname, dimensions, violations, incomplete: axe.incomplete.length });
  if (dimensions.width > dimensions.viewport + 1) report.errors.push({ name, type: 'overflow', dimensions });
  if (violations.some(v => ['critical', 'serious'].includes(v.impact))) report.errors.push({ name, type: 'accessibility', violations });
}
async function login(page, role) {
  await page.goto(role === 'atlas' ? '/admin/login' : '/login', { waitUntil: 'networkidle' });
  const email = `${role}@demo.atlaslink.mx`;
  await page.getByRole('button').filter({ has: page.getByText(email, { exact: true }) }).click();
  await expect(page.getByLabel('Correo institucional')).toHaveValue(email);
  await expect(page.locator('input[name="password"]')).toHaveValue('AtlasDemo2026!');
  if (role === 'admin' || role === 'atlas') {
    await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
  }
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(role === 'atlas' ? '/admin$' : '/hospital$'));
  await expect(page.locator('[data-system-cover]')).toBeVisible();
  await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
}

try {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ baseURL, viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.name === 'mobile', hasTouch: viewport.name === 'mobile', locale: 'es-MX', timezoneId: 'America/Mexico_City' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ viewport: viewport.name, type: 'javascript', message: error.message }));
    page.on('response', response => { if (response.status() >= 500) report.errors.push({ viewport: viewport.name, type: 'http', status: response.status(), path: new URL(response.url()).pathname }); });
    try {
      await page.goto('/', { waitUntil: 'networkidle' });
      await inspect(page, `${viewport.name}-landing`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const moving = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length);
      report.interactionChecks.push({ name: `${viewport.name}-reduced-motion`, infiniteRunningAnimations: moving });
      if (moving > 0) report.errors.push({ viewport: viewport.name, type: 'reduced-motion', infiniteRunningAnimations: moving });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const route of ['/login', '/admin/login']) {
        await page.goto(route, { waitUntil: 'networkidle' });
        await inspect(page, `${viewport.name}-${route === '/login' ? 'hospital-login' : 'platform-login'}`);
      }
      await login(page, 'admin');
      const mobileMenu = page.getByRole('button', { name: 'Abrir menú', exact: true });
      if (await mobileMenu.isVisible()) await mobileMenu.click();
      await page.getByRole('button', { name: 'Centro de ayuda', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      if (await mobileMenu.isVisible()) {
        await page.keyboard.press('Escape');
        await expect(mobileMenu).toHaveAttribute('aria-expanded', 'false');
      }
      report.interactionChecks.push({ name: `${viewport.name}-help-modal-and-navigation`, passed: true });
      for (const route of ['/hospital', '/hospital/accounts', '/hospital/review', '/hospital/import', '/hospital/agreements', '/hospital/reports', '/hospital/users', '/hospital/audit']) {
        await page.goto(route, { waitUntil: 'networkidle' });
        await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
        await inspect(page, `${viewport.name}-${route.replaceAll('/', '-').slice(1)}`);
        if (route === '/hospital/accounts') {
          const first = page.locator('a[href^="/hospital/accounts/"]').first();
          if (await first.count()) {
            await first.click();
            await expect(page.locator('h1')).toBeVisible();
            await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
            await inspect(page, `${viewport.name}-account-detail`);
          }
        }
      }
      await login(page, 'atlas');
      for (const route of ['/admin', '/admin/tenants', '/admin/licenses', '/admin/leads', '/admin/users', '/admin/audit']) {
        await page.goto(route, { waitUntil: 'networkidle' });
        await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
        await inspect(page, `${viewport.name}-${route.replaceAll('/', '-').slice(1)}`);
      }
      const bearer = await page.evaluate(() => JSON.parse(sessionStorage.getItem('atlas.session') || '{}').token);
      const tenantsResponse = await page.request.get('/api/tenants', { headers: { Authorization: `Bearer ${bearer}` } });
      expect(tenantsResponse.ok()).toBeTruthy();
      const tenants = await tenantsResponse.json();
      const accountCount = tenants.reduce((sum, tenant) => sum + Number(tenant.accountCount), 0);
      expect(accountCount).toBe(20);
      report.interactionChecks.push({ name: `${viewport.name}-unchanged-demo-accounts`, accountCount });
      for (const role of ['caja', 'auditor', 'direccion', 'aseguradora']) {
        await login(page, role);
        await expect(page.locator('[data-system-cover]')).toBeVisible();
        report.interactionChecks.push({ name: `${viewport.name}-${role}-demo-login`, passed: true });
      }
      report.interactionChecks.push({ name: `${viewport.name}-demo-profile-login`, passed: true });
    } catch (error) { report.errors.push({ viewport: viewport.name, type: 'journey', message: error.message }); }
    await context.close();
  }
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.errors.length === 0 && report.views.length >= 34;
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, views: report.views.length, errors: report.errors.map(error => error.type === 'accessibility' ? { name: error.name, type: error.type, violations: error.violations.map(v => ({ id: v.id, nodes: v.nodes.length })) } : error) }, null, 2));
  process.exit(report.passed ? 0 : 1);
}
