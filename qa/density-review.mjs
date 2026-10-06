import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4300';
const output = path.join(root, 'evidence/density-v5');
await mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP(process.env.QA_CDP_URL || 'http://127.0.0.1:9430');
const report = { startedAt: new Date().toISOString(), baseURL, browser: browser.version(), scope: 'Compact chart layout and existing interactions on desktop and emulated touch viewport; no physical-mobile or FPS claims.', checks: [], errors: [] };

async function login(page) {
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button').filter({ has: page.getByText('admin@demo.atlaslink.mx', { exact: true }) }).click();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/hospital$/);
  const pie = page.locator('[data-analytics-sculpture="pie"]').first();
  await pie.scrollIntoViewIfNeeded();
  return pie;
}

async function layout(chart) {
  return chart.evaluate(figure => {
    const host = figure.querySelector('[data-sculpture-host]');
    const buttons = [...figure.querySelectorAll('[role="group"] button')];
    return {
      chartWidth: figure.getBoundingClientRect().width,
      stageHeight: host.getBoundingClientRect().height,
      stageWidth: host.getBoundingClientRect().width,
      rows: buttons.map(button => ({ height: button.getBoundingClientRect().height, text: button.textContent, labelSize: getComputedStyle(button.querySelector('span:nth-child(2)')).fontSize, valueOnSameRow: Math.abs(button.querySelector('span:nth-child(2)').getBoundingClientRect().top - button.querySelector('strong').getBoundingClientRect().top) < 5 })),
    };
  });
}

try {
  for (const [name, width, height, mobile] of [['desktop', 1440, 1000, false], ['mobile-emulated', 390, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, locale: 'es-MX' });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      const landing = page.locator('[data-analytics-sculpture]').first();
      await expect(landing).toHaveAttribute('data-density', 'regular');
      const landingHeight = await landing.locator('[data-sculpture-host]').evaluate(host => host.clientHeight);
      expect(landingHeight).toBe(mobile ? 200 : 220);
      report.checks.push({ name: `${name}-landing-framing-unchanged`, passed: true, stageHeight: landingHeight });

      const pie = await login(page);
      await expect(pie).toHaveAttribute('data-density', 'compact');
      await expect(pie).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
      const sizes = await layout(pie);
      expect(sizes.stageHeight).toBe(mobile ? 210 : 200);
      expect(sizes.chartWidth).toBeLessThanOrEqual(400);
      expect(sizes.rows.every(row => row.height >= (mobile ? 44 : 36))).toBe(true);
      expect(sizes.rows.every(row => Number.parseFloat(row.labelSize) >= 12)).toBe(true);
      expect(sizes.rows.every(row => row.valueOnSameRow)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const choices = pie.getByRole('group').getByRole('button');
      const values = await choices.allTextContents();
      if (mobile) await choices.nth(1).tap();
      else { await choices.nth(0).focus(); await page.keyboard.press('ArrowRight'); await expect(choices.nth(1)).toBeFocused(); }
      await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
      expect(await choices.allTextContents()).toEqual(values);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(1200);
      const host = pie.locator('[data-sculpture-host]');
      const before = await host.getAttribute('data-frames');
      await page.waitForTimeout(700);
      expect(await host.getAttribute('data-frames')).toBe(before);
      await pie.locator('xpath=ancestor::*[self::section or self::aside][1]').screenshot({ path: path.join(output, `${name}-compact-pie-panel.png`) });
      await pie.screenshot({ path: path.join(output, `${name}-compact-pie.png`) });
      report.checks.push({ name: `${name}-compact-pie`, passed: true, sizes, values, interaction: mobile ? 'Touch' : 'Keyboard', idleRenderCalls: 0, idleMilliseconds: 700 });

      await page.getByRole('button', { name: 'Volumen', exact: true }).click();
      const bars = page.locator('[data-analytics-sculpture="bars"]').first();
      await bars.scrollIntoViewIfNeeded();
      await expect(bars).toHaveAttribute('data-density', 'compact');
      await expect(bars).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
      const barSizes = await layout(bars);
      expect(barSizes.stageHeight).toBe(mobile ? 210 : 200);
      await bars.screenshot({ path: path.join(output, `${name}-compact-bars.png`) });
      report.checks.push({ name: `${name}-compact-bars`, passed: true, sizes: barSizes });
    } finally { await context.close(); }
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
        return original.call(this, type, ...args);
      };
    });
    const page = await context.newPage();
    const pie = await login(page);
    await expect(pie).toHaveAttribute('data-renderer', 'fallback');
    await expect(pie.locator('svg').first()).toBeVisible();
    const choices = pie.getByRole('group').getByRole('button');
    await choices.nth(2).tap();
    await expect(choices.nth(2)).toHaveAttribute('aria-pressed', 'true');
    const sizes = await layout(pie);
    expect(sizes.stageHeight).toBe(210);
    await pie.screenshot({ path: path.join(output, 'mobile-compact-fallback.png') });
    report.checks.push({ name: 'compact-svg-fallback', passed: true, sizes, values: await choices.allTextContents() });
  } finally { await context.close(); }
} catch (error) {
  report.errors.push(error.message);
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.length === 7 && report.errors.length === 0;
  await writeFile(path.join(output, 'density-review.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors }, null, 2));
  await browser.close();
  process.exitCode = report.passed ? 0 : 1;
}
