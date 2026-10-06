// Packaged-production smoke: reads only, apart from authentication/session audit.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const baseURL = process.env.ATLAS_PRODUCTION_URL || 'http://127.0.0.1:4430';
const output = path.resolve(process.env.ATLAS_SMOKE_OUTPUT || '../evidence/redesign/production-smoke');
const extended = process.env.ATLAS_SMOKE_EXTENDED === 'true';
await mkdir(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), baseURL, environment: 'Docker production build; Chrome installed; desktop and mobile viewport emulation; synthetic demo data', mutations: 'Authentication/session audit only; no creation or modification of business data', pages: [], publicAssets: [], reducedMotion: [], businessAccountCounts: [], browserErrors: [], httpErrors: [], consoleErrors: [], failures: [] };
const browser = await chromium.connectOverCDP(process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9430');
report.browserVersion = browser.version();
async function inspect(page, label, viewport, screenshot = true) {
  await expect(page.getByRole('heading').first()).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  // Capture before axe changes focus while checking scrollable regions.
  if (screenshot) await page.screenshot({ path: path.join(output, `${viewport}-${label}.png`), fullPage: true, animations: 'disabled', caret: 'initial' });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = axe.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  const result = { label, viewport, route: new URL(page.url()).pathname, dimensions, violations: axe.violations, incomplete: axe.incomplete.length, passed: dimensions.document <= dimensions.viewport + 1 && serious.length === 0 };
  report.pages.push(result);
  if (!result.passed) report.failures.push({ label, viewport, reason: 'Responsive or axe check failed', dimensions, issues: serious.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
}
function diagnostics(page, scope) {
  page.on('pageerror', error => report.browserErrors.push({ scope, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ scope, message: message.text() }); });
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(baseURL)) report.httpErrors.push({ scope, url: new URL(response.url()).pathname, status: response.status() }); });
}
try {
  for (const viewport of [{name:'desktop',width:1440,height:1000,mobile:false},{name:'mobile-emulated',width:390,height:844,mobile:true}]) {
    const context = await browser.newContext({ baseURL, viewport: {width:viewport.width,height:viewport.height}, isMobile:viewport.mobile, hasTouch:viewport.mobile, locale:'es-MX', timezoneId:'America/Mexico_City' });
    const page = await context.newPage();
    diagnostics(page, viewport.name);
    try {
      await page.goto('/', { waitUntil:'domcontentloaded' });
      await expect(page.getByRole('heading', { level:1 })).toHaveText(/Cada cuenta,\s*en perspectiva\./);
      const image = page.getByRole('img', {name:'Profesionales sanitarios colaboran en un entorno hospitalario'});
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
      if (viewport.name === 'desktop') {
        for (const asset of ['/favicon.svg', '/brand/atlas-link-mark.svg', '/brand/atlas-link-wordmark.svg', '/brand/atlas-link-social.svg', '/contracts/account-v1.schema.json']) {
          const response = await page.request.get(asset);
          report.publicAssets.push({ path: asset, status: response.status(), contentType: response.headers()['content-type'] });
          expect(response.status(), `Public asset ${asset}`).toBe(200);
          if (asset.endsWith('.json')) expect((await response.json()).type).toBe('object');
          else expect(await response.text()).toContain('<svg');
        }
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('[data-analytics-sculpture]').first()).toBeVisible();
      const infiniteAnimations = await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations === Infinity).length);
      expect(infiniteAnimations).toBe(0);
      report.reducedMotion.push({ viewport: viewport.name, infiniteAnimations, passed: true });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await inspect(page,'landing',viewport.name);
    } catch (error) { report.failures.push({ label:'landing',viewport:viewport.name,message:error.message }); }
    for (const role of ['admin','caja','auditor','direccion','aseguradora','atlas']) {
      try {
        const platform = role === 'atlas';
        await page.goto(platform ? '/admin/login' : '/login', {waitUntil:'domcontentloaded'});
        const email = `${role}@demo.atlaslink.mx`;
        await page.getByRole('button').filter({has:page.getByText(email,{exact:true})}).click();
        await expect(page.getByLabel('Correo institucional')).toHaveValue(email);
        await expect(page.locator('input[name="password"]')).toHaveValue('AtlasDemo2026!');
        if (role === 'admin' || platform) await inspect(page,`${role}-login`,viewport.name);
        await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
        await expect(page.locator('[data-system-cover]')).toBeVisible();
        await inspect(page,`${role}-dashboard`,viewport.name,role==='admin'||platform);
        if (role === 'admin') {
          await page.goto('/hospital/accounts',{waitUntil:'domcontentloaded'});
          await expect(page.getByRole('table')).toBeVisible();
          await inspect(page,'accounts',viewport.name);
          await page.goto('/hospital/agreements',{waitUntil:'domcontentloaded'});
          await expect(page.getByRole('heading',{level:1})).toBeVisible();
          await expect(page.getByText('Cargando información…',{exact:true})).toHaveCount(0);
          await inspect(page,'agreements',viewport.name);
        }
        if (platform) {
          await page.goto('/admin/licenses',{waitUntil:'domcontentloaded'});
          await expect(page.getByRole('table')).toBeVisible();
          await inspect(page,'licenses',viewport.name);
          const bearer = await page.evaluate(() => JSON.parse(sessionStorage.getItem('atlas.session') || '{}').token);
          const tenantsResponse = await page.request.get('/api/tenants', { headers: { Authorization: `Bearer ${bearer}` } });
          expect(tenantsResponse.ok()).toBeTruthy();
          const tenants = await tenantsResponse.json();
          const accountCount = tenants.reduce((total, tenant) => total + Number(tenant.accountCount), 0);
          report.businessAccountCounts.push({ viewport: viewport.name, accountCount });
          expect(accountCount, 'Docker demo accounts remain unchanged').toBe(Number(process.env.ATLAS_EXPECTED_DEMO_ACCOUNTS || 20));
        }
        if (extended && (role === 'admin' || platform)) {
          const routes = platform
            ? ['/admin/tenants', '/admin/leads', '/admin/users', '/admin/audit']
            : ['/hospital/review', '/hospital/reports', '/hospital/import', '/hospital/users', '/hospital/audit'];
          for (const route of routes) {
            await page.goto(route, { waitUntil:'domcontentloaded' });
            await expect(page.getByRole('heading', { level:1 })).toBeVisible();
            await expect(page.getByText('Cargando información…', { exact:true })).toHaveCount(0);
            await inspect(page, route.slice(1).replaceAll('/', '-'), viewport.name);
          }
        }
      } catch (error) { report.failures.push({ label:role,viewport:viewport.name,message:error.message }); }
    }
    await context.close();
  }
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.pages.length === (extended ? 42 : 24) && report.pages.every(p=>p.passed) && report.failures.length === 0 && report.browserErrors.length === 0 && report.httpErrors.length === 0 && report.consoleErrors.length === 0;
  const json = JSON.stringify(report,null,2);
  await writeFile(path.join(output,'report.json'),json);
  if (!process.env.ATLAS_SMOKE_OUTPUT) await writeFile(path.resolve('../evidence/redesign/production-smoke.json'),json);
  console.log(JSON.stringify({passed:report.passed,pages:report.pages.length,failures:report.failures,browserErrors:report.browserErrors,httpErrors:report.httpErrors,consoleErrors:report.consoleErrors},null,2));
  // Keep Chrome shared by the other agents. Contexts above are ours and are closed.
  process.exit(report.passed?0:1);
}
