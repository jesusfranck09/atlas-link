import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'evidence/glass-v6');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4430';
const cdpURL = process.env.QA_CDP_URL || 'http://127.0.0.1:9430';
const report = {
  startedAt: new Date().toISOString(), baseURL,
  scope: 'Hospital reports with real local API responses and synthetic data; desktop and emulated mobile. Authentication and read-only filtering; no business-data writes or downloads.',
  checks: [], errors: [], views: [],
};
const printable = value => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 6 }).format(value);
await mkdir(output, { recursive: true });

async function check(name, action) {
  try { report.checks.push({ name, passed: true, ...await action() }); return true; }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name, passed: false, message });
    report.errors.push({ name, type: 'assertion', message });
    return false;
  }
}

async function readReport(page, query = '') {
  const result = await page.evaluate(async queryString => {
    const session = JSON.parse(sessionStorage.getItem('atlas.session') || 'null');
    const response = await fetch(`/api/accounts/report${queryString ? `?${queryString}` : ''}`, {
      headers: { Authorization: `Bearer ${session?.token || ''}` }, cache: 'no-store',
    });
    return { status: response.status, data: response.ok ? await response.json() : null };
  }, query);
  expect(result.status, 'Read-only report API must succeed').toBe(200);
  expect(Array.isArray(result.data?.byInsurer), 'Report API must return insurer groups').toBe(true);
  return result.data;
}

async function waitForReport(page, change, matchesQuery) {
  const responsePromise = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/accounts/report' && response.request().method() === 'GET' && matchesQuery(url.searchParams);
  });
  await change();
  const response = await responsePromise;
  expect(response.status(), 'Filter report request must succeed').toBe(200);
  const data = await response.json();
  await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
  return data;
}

async function inspect(page, name, viewport) {
  await page.evaluate(() => document.fonts.ready);
  for (const figure of await page.locator('[data-analytics-sculpture]').all()) {
    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toHaveAttribute('data-renderer', /^(webgl|fallback)$/, { timeout: 20000 });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth,
  }));
  expect(dimensions.documentWidth, 'Document must fit the configured viewport').toBeLessThanOrEqual(viewport.width + 1);
  const metrics = await page.locator('.metrics-grid').evaluate(element => {
    const style = getComputedStyle(element);
    return {
      columnGap: style.columnGap, rowGap: style.rowGap,
      cards: [...element.children].map(card => {
        const rect = card.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    };
  });
  expect(Number.parseFloat(metrics.columnGap), 'Metric values need visible horizontal separation').toBeGreaterThan(0);
  expect(Number.parseFloat(metrics.rowGap), 'Metric rows need visible vertical separation').toBeGreaterThan(0);
  expect(metrics.cards).toHaveLength(4);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const violations = accessibility.violations.map(item => ({
    id: item.id, impact: item.impact,
    nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })),
  }));
  const renderers = await page.locator('[data-analytics-sculpture]').evaluateAll(figures => figures.map(figure => ({
    type: figure.getAttribute('data-analytics-sculpture'), renderer: figure.getAttribute('data-renderer'),
  })));
  const screenshot = path.join(output, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
  report.views.push({ name, dimensions, metrics, renderers, screenshot: path.relative(root, screenshot), violations, incompleteAxeChecks: accessibility.incomplete.length });
  expect(violations, 'Automated accessibility must have no detected violations').toEqual([]);
  return { dimensions, renderers };
}

try {
  const browser = await chromium.connectOverCDP(cdpURL);
  report.browserVersion = browser.version();
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      baseURL, viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.name === 'mobile', hasTouch: viewport.name === 'mobile',
      locale: 'es-MX', timezoneId: 'America/Mexico_City',
    });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({ name: viewport.name, type: 'javascript', message: error.message }));
      page.on('response', response => {
        if (response.status() >= 500) report.errors.push({ name: viewport.name, type: 'http', status: response.status(), path: new URL(response.url()).pathname });
      });
      const loggedIn = await check(`${viewport.name}-demo-login`, async () => {
        await page.goto('/login', { waitUntil: 'networkidle' });
        await page.getByRole('button').filter({ has: page.getByText('admin@demo.atlaslink.mx', { exact: true }) }).click();
        await expect(page.getByLabel('Correo institucional')).toHaveValue('admin@demo.atlaslink.mx');
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/\/hospital$/);
        await expect(page.locator('[data-system-cover]')).toBeVisible();
        return { role: 'HOSPITAL_ADMIN', dataset: 'Synthetic demonstration' };
      });
      if (!loggedIn) continue;
      await page.goto('/hospital/reports', { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: 'Reportes', exact: true })).toBeVisible();
      const baseline = await readReport(page);
      const pie = page.locator('[data-analytics-sculpture="pie"]');
      const bars = page.locator('[data-analytics-sculpture="bars"]');
      const insurerSelect = page.locator('.report-filters').getByRole('combobox');
      const download = page.getByRole('button', { name: 'Descargar reporte', exact: true });
      await check(`${viewport.name}-reports-pie-bars-and-metric-spacing`, async () => {
        expect(baseline.totalAccounts, 'Seeded report should have accounts').toBeGreaterThan(0);
        await expect(pie).toHaveCount(1);
        await expect(bars).toHaveCount(1);
        const categories = pie.getByRole('group', { name: 'Explorar categorías del gráfico' }).getByRole('button');
        await expect(categories).toHaveCount(baseline.byInsurer.length);
        for (const group of baseline.byInsurer) {
          const category = categories.filter({ hasText: group.name });
          await expect(category.locator('strong')).toHaveText(printable(group.count));
        }
        const laneValues = bars.getByRole('group', { name: 'Explorar categorías del gráfico' }).getByRole('button');
        await expect(laneValues).toHaveCount(3);
        for (const [index, lane] of ['GREEN', 'YELLOW', 'RED'].entries()) await expect(laneValues.nth(index).locator('strong')).toHaveText(printable(baseline.byLane[lane] || 0));
        await expect(download).toBeEnabled();
        return { totalAccounts: baseline.totalAccounts, insurerCategories: baseline.byInsurer.length, ...await inspect(page, `report-${viewport.name}`, viewport) };
      });
      await check(`${viewport.name}-single-insurer-matches-api`, async () => {
        const firstInsurer = insurerSelect.locator('option').nth(1);
        await expect(firstInsurer).toHaveCount(1);
        const insurerId = await firstInsurer.getAttribute('value');
        expect(insurerId).toBeTruthy();
        const filtered = await waitForReport(page, () => insurerSelect.selectOption(insurerId), query => query.get('insurerId') === insurerId && !query.has('from'));
        const direct = await readReport(page, new URLSearchParams({ insurerId }).toString());
        expect(filtered.totalAccounts).toBe(direct.totalAccounts);
        expect(filtered.byInsurer).toHaveLength(1);
        expect(filtered.byInsurer[0].insurerId).toBe(insurerId);
        expect(filtered.byInsurer[0].count).toBe(direct.totalAccounts);
        const categories = pie.getByRole('group', { name: 'Explorar categorías del gráfico' }).getByRole('button');
        await expect(categories).toHaveCount(1);
        await expect(categories.first().locator('strong')).toHaveText(printable(direct.totalAccounts));
        await categories.first().click();
        await expect(categories.first()).toHaveAttribute('aria-pressed', 'true');
        return { insurerId, countFromApi: direct.totalAccounts, ...await inspect(page, `report-${viewport.name}-single-insurer`, viewport) };
      });
      await check(`${viewport.name}-future-period-empty-state`, async () => {
        const empty = await waitForReport(page, () => page.getByLabel('Desde', { exact: true }).fill('2099-01-01'), query => query.get('from') === '2099-01-01');
        expect(empty.totalAccounts).toBe(0);
        expect(empty.byInsurer).toHaveLength(0);
        await expect(page.getByRole('heading', { name: 'Sin cuentas en el periodo', exact: true })).toBeVisible();
        await expect(pie).toHaveCount(0);
        await expect(download).toBeDisabled();
        return { totalAccounts: empty.totalAccounts, downloadDisabled: true, ...await inspect(page, `report-${viewport.name}-empty`, viewport) };
      });
      await check(`${viewport.name}-clear-restores-original-report`, async () => {
        const restored = await waitForReport(page, () => page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click(), query => !query.has('from') && !query.has('to') && !query.has('insurerId'));
        await expect(page.getByLabel('Desde', { exact: true })).toHaveValue('');
        await expect(page.getByLabel('Hasta', { exact: true })).toHaveValue('');
        await expect(insurerSelect).toHaveValue('ALL');
        await expect(pie).toHaveCount(1);
        await expect(download).toBeEnabled();
        expect(restored.totalAccounts).toBe(baseline.totalAccounts);
        expect(restored.totalBilled).toBe(baseline.totalBilled);
        expect(restored.byInsurer).toEqual(baseline.byInsurer);
        return { originalAccountCount: baseline.totalAccounts, restoredAccountCount: restored.totalAccounts };
      });
    } catch (error) {
      report.errors.push({ name: viewport.name, type: 'journey', message: error instanceof Error ? error.message : String(error) });
    } finally { await context.close(); }
  }
  // Only contexts created by this script are closed. Exit disconnects our CDP
  // client while preserving the shared Chrome process and other agents' tabs.
} catch (error) {
  report.errors.push({ name: 'runner', type: 'setup', message: error instanceof Error ? error.message : String(error) });
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.errors.length === 0 && report.checks.length === 10 && report.checks.every(item => item.passed) && report.views.length === 6;
  await writeFile(path.join(output, 'report-visual-review.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, views: report.views.length, errors: report.errors }, null, 2));
  process.exit(report.passed ? 0 : 1);
}
