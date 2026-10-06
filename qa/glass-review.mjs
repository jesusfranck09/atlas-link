import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4300';
const output = path.join(root, 'evidence/glass-v6');
await mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP(process.env.QA_CDP_URL || 'http://127.0.0.1:9430');
const report = {
  startedAt: new Date().toISOString(), baseURL, browser: browser.version(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  build: 'Current working tree, development server unless QA_BASE_URL points to production',
  platform: `${os.type()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model,
  three: JSON.parse(await readFile(path.join(root, 'frontend/node_modules/three/package.json'), 'utf8')).version,
  scope: 'Real browser WebGL glass material, DOM controls and exact dataset; mobile emulation. Single-category input is an explicitly intercepted QA fixture, never persisted.',
  limits: 'Renderer call counters are not FPS or GPU timing. No battery, VRAM, physical-mobile, Windows or Safari claims. Single shared half-resolution transmission buffer; no postprocessing.',
  beforeScreenshot: 'evidence/density-v5/desktop-compact-pie.png', checks: [], errors: [],
};

async function check(name, action) {
  try { report.checks.push({ name, passed: true, ...await action() }); }
  catch (error) { report.checks.push({ name, passed: false, message: error.message }); report.errors.push({ name, message: error.message }); }
}

async function hospital(page) {
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button').filter({ has: page.getByText('admin@demo.atlaslink.mx', { exact: true }) }).click();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/hospital$/);
  const chart = page.locator('[data-analytics-sculpture="pie"]').first();
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toHaveAttribute('data-finish', 'glass');
  return chart;
}
const ready = chart => expect(chart).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
const frames = chart => chart.locator('[data-sculpture-host]').evaluate(element => Number(element.dataset.frames));
async function stats(chart) {
  return chart.locator('[data-sculpture-host]').evaluate(host => {
    const canvas = host.querySelector('canvas');
    const gl = canvas.getContext('webgl2');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { ...host.dataset, cssWidth: host.clientWidth, cssHeight: host.clientHeight, canvasWidth: canvas.width, canvasHeight: canvas.height, adapter: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Unavailable' };
  });
}

try {
  for (const [name, width, height, touch] of [['desktop', 1440, 1000, false], ['mobile-emulated', 390, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({ name: 'javascript', message: error.message }));
      page.on('console', message => { if (message.type() === 'error' && /shader|THREE|WebGL/i.test(message.text())) report.errors.push({ name: 'graphics-console', message: message.text() }); });
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      const landing = page.locator('[data-analytics-sculpture]').first();
      await check(`${name}-landing-standard-preserved`, async () => {
        await expect(landing).toHaveAttribute('data-finish', 'standard');
        expect(await landing.locator('[data-sculpture-host]').evaluate(host => host.clientHeight)).toBe(touch ? 200 : 220);
        return { finish: 'standard', legacyFraming: true };
      });
      const chart = await hospital(page);
      await ready(chart);
      const choices = chart.getByRole('group').getByRole('button');
      await check(`${name}-glass-pie-values-and-selection`, async () => {
        const source = await page.evaluate(async () => {
          const session = JSON.parse(sessionStorage.getItem('atlas.session'));
          const result = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${session.token}` } });
          if (!result.ok) throw new Error(`Dashboard API ${result.status}`);
          const data = await result.json();
          return ['GREEN', 'YELLOW', 'RED'].map(key => data.byLane[key] || 0);
        });
        const values = (await chart.locator('tbody td').allTextContents()).map(value => Number(value.replaceAll(',', '')));
        expect(values).toEqual(source);
        if (touch) await choices.nth(1).tap();
        else { await choices.nth(0).focus(); await page.keyboard.press('ArrowRight'); await expect(choices.nth(1)).toBeFocused(); }
        await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
        await page.waitForTimeout(1100);
        const state = await stats(chart);
        expect(Number(state.pixelRatio)).toBeLessThanOrEqual(1.5);
        expect(Number(state.drawCalls)).toBeLessThanOrEqual(16);
        expect(Number(state.triangles)).toBeLessThan(60000);
        expect(state.transmissionScale).toBe('0.5');
        expect(state.cssHeight).toBe(touch ? 210 : 220);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await chart.screenshot({ path: path.join(output, `${name}-glass-pie.png`) });
        return { source, values, stats: state, input: touch ? 'Touch' : 'Arrow keys' };
      });
      await check(`${name}-glass-idle`, async () => {
        await page.mouse.move(0, 0); await page.waitForTimeout(1100);
        const before = await frames(chart); await page.waitForTimeout(1000);
        expect(await frames(chart)).toBe(before);
        return { before, after: await frames(chart), idleMilliseconds: 1000 };
      });
      if (!touch) await check('glass-context-loss-restoration', async () => {
        const available = await chart.locator('canvas').evaluate(canvas => {
          const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
          if (!extension) return false;
          window.__restoreAtlasGlass = () => extension.restoreContext();
          extension.loseContext(); return true;
        });
        expect(available).toBe(true);
        await expect(chart).toHaveAttribute('data-renderer', 'fallback');
        await choices.nth(2).click(); await expect(choices.nth(2)).toHaveAttribute('aria-pressed', 'true');
        await chart.screenshot({ path: path.join(output, 'context-loss-glass-svg.png') });
        await page.waitForTimeout(1200);
        await page.evaluate(() => { window.__restoreAtlasGlass(); delete window.__restoreAtlasGlass; });
        await ready(chart);
        await expect(choices.nth(2)).toHaveAttribute('aria-pressed', 'true');
        await chart.screenshot({ path: path.join(output, 'restored-glass-pie.png') });
        return { selectionRetained: true, rendererRecovered: true };
      });
      await check(`${name}-glass-bars`, async () => {
        await page.getByRole('button', { name: 'Volumen', exact: true }).click();
        const bars = page.locator('[data-analytics-sculpture="bars"]').first();
        await bars.scrollIntoViewIfNeeded(); await ready(bars);
        await expect(bars).toHaveAttribute('data-finish', 'glass');
        await bars.screenshot({ path: path.join(output, `${name}-glass-bars.png`) });
        return { values: await bars.locator('tbody').allTextContents(), stats: await stats(bars) };
      });
      if (!touch) await check('single-category-full-glass-disk', async () => {
        await page.route('**/api/dashboard', async route => {
          const response = await route.fetch(); const data = await response.json();
          const total = Object.values(data.byLane).reduce((sum, value) => sum + value, 0);
          await route.fulfill({ response, json: { ...data, byLane: { GREEN: total, YELLOW: 0, RED: 0 } } });
        });
        await page.reload({ waitUntil: 'networkidle' });
        const disk = page.locator('[data-analytics-sculpture="pie"]').first();
        await disk.scrollIntoViewIfNeeded(); await ready(disk);
        const paths = await disk.locator('svg path').evaluateAll(elements => elements.map(element => element.getAttribute('d')).filter(Boolean));
        expect(paths.length).toBeGreaterThan(0);
        expect(paths.every(path => !path.startsWith('M0 0L') && path.endsWith('Z'))).toBe(true);
        const values = await disk.locator('tbody td').allTextContents();
        expect(values.slice(1)).toEqual(['0', '0']);
        await disk.screenshot({ path: path.join(output, 'fixture-single-category-glass.png') });
        await page.unroute('**/api/dashboard');
        return { fixture: 'Existing total temporarily allocated to one category by response interception; no DB mutation', values, closedDiskWithoutRadialSeam: true, stats: await stats(disk) };
      });
    } finally { await context.close(); }
  }

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    const page = await reduced.newPage(); await page.emulateMedia({ reducedMotion: 'reduce' });
    const chart = await hospital(page); await ready(chart);
    await check('glass-reduced-motion', async () => {
      await expect(chart.locator('[data-sculpture-host]')).toHaveAttribute('data-motion', 'reduced');
      const choices = chart.getByRole('group').getByRole('button');
      await page.waitForTimeout(250); const before = await frames(chart);
      await choices.nth(2).click(); await page.waitForTimeout(250);
      const after = await frames(chart); expect(after - before).toBeLessThanOrEqual(2);
      const box = await chart.locator('canvas').boundingBox();
      await page.mouse.move(box.x + box.width * .25, box.y + box.height * .5);
      await page.mouse.move(box.x + box.width * .75, box.y + box.height * .5, { steps: 5 });
      await page.waitForTimeout(250); expect(await frames(chart)).toBe(after);
      return { selectionFrames: after - before, pointerFrames: 0 };
    });
  } finally { await reduced.close(); }

  const fallback = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null; return original.call(this, type, ...args); }; });
    const page = await fallback.newPage(); const chart = await hospital(page);
    await check('glass-initialization-unavailable-svg', async () => {
      await expect(chart).toHaveAttribute('data-renderer', 'fallback');
      await expect(chart.locator('canvas')).toHaveCount(0); await expect(chart.locator('svg').first()).toBeVisible();
      const choices = chart.getByRole('group').getByRole('button'); const values = await choices.allTextContents();
      await choices.nth(1).tap(); await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
      expect(await choices.allTextContents()).toEqual(values);
      await chart.screenshot({ path: path.join(output, 'mobile-glass-svg-fallback.png') });
      return { values, selectionWithoutWebGL: true, failure: 'WebGL unavailable before app initialization' };
    });
  } finally { await fallback.close(); }
} catch (error) { report.errors.push({ name: 'setup', message: error.message }); }
finally {
  report.finishedAt = new Date().toISOString(); report.passed = report.checks.length === 12 && report.errors.length === 0;
  await writeFile(path.join(output, 'glass-review.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors }, null, 2));
  // Every context created above is closed locally. Never close the shared CDP
  // browser; process exit only disconnects this runner's client connection.
  process.exit(report.passed ? 0 : 1);
}
