import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4300';
const output = path.join(root, process.env.QA_SCULPTURE_OUTPUT || 'evidence/compact-v5');
await mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP(process.env.QA_CDP_URL || 'http://127.0.0.1:9430');
const report = {
  startedAt: new Date().toISOString(), baseURL,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  worktree: 'Includes current uncommitted visual implementation',
  browser: browser.version(), platform: `${os.type()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model,
  scope: 'Real local WebGL render, controls, demand-driven rest, pause, graphics loss/recovery, SVG fallback, and synthetic account dashboard. Mobile is emulated, not a physical device.',
  limits: 'No FPS/GPU-time/battery/VRAM or physical Windows/iOS/Android claims. RAF counters measure renderer calls, not frame presentation. Screenshots use browser-rendered WebGL with the identified graphics adapter.',
  checks: [], errors: [],
};

async function check(name, action) {
  try { report.checks.push({ name, passed: true, ...await action() }); }
  catch (error) { report.checks.push({ name, passed: false, message: error.message }); report.errors.push({ name, message: error.message }); }
}

async function openScene(context, expectedGraphicsFailure = false, reduceMotion = false) {
  const page = await context.newPage();
  // Explicitly apply to this target before app load. Other CDP clients can attach
  // to the same browser, so the measured media preference is also asserted below.
  if (reduceMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push({ name: 'javascript', message: error.message }));
  page.on('console', message => {
    if (message.type() !== 'error' || !/THREE|WebGL|shader/i.test(message.text())) return;
    if (expectedGraphicsFailure && /Error creating WebGL context/.test(message.text())) return;
    report.errors.push({ name: 'graphics-console', message: message.text() });
  });
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`Landing did not load: HTTP ${response?.status() ?? 'unavailable'}`);
  const figure = page.locator('[data-analytics-sculpture]').first();
  await figure.scrollIntoViewIfNeeded();
  return { page, figure, host: figure.locator('[data-sculpture-host]'), choices: figure.getByRole('group').getByRole('button') };
}

async function ready(figure) { await expect(figure).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 }); }
async function hospital(page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByRole('button').filter({ has: page.getByText('admin@demo.atlaslink.mx', { exact: true }) }).click();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/hospital$/);
  const chart = page.locator('[data-analytics-sculpture="pie"]').first();
  await chart.scrollIntoViewIfNeeded();
  return chart;
}
async function frames(host) { return Number(await host.getAttribute('data-frames')); }
async function statistics(host) {
  return host.evaluate(element => {
    const canvas = element.querySelector('canvas');
    const gl = canvas.getContext('webgl2');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { ...element.dataset, cssWidth: element.clientWidth, cssHeight: element.clientHeight, drawingWidth: canvas.width, drawingHeight: canvas.height,
      adapter: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Unavailable',
      vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : 'Unavailable',
      webglVersion: gl.getParameter(gl.VERSION),
    };
  });
}

try {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000, dpr: 1 }, { name: 'mobile-emulated', width: 390, height: 844, dpr: 2 }]) {
    const context = await browser.newContext({ baseURL, viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.dpr, isMobile: viewport.name !== 'desktop', hasTouch: viewport.name !== 'desktop', locale: 'es-MX', timezoneId: 'America/Mexico_City' });
    try {
      const { page, figure, host, choices } = await openScene(context);
      await check(`${viewport.name}-webgl-geometry`, async () => {
        await ready(figure);
        await expect(choices).toHaveCount(3);
        const stats = await statistics(host);
        expect(Number(stats.triangles)).toBeGreaterThan(100);
        expect(Number(stats.triangles)).toBeLessThan(60000);
        expect(Number(stats.drawCalls)).toBeLessThan(20);
        expect(Number(stats.pixelRatio)).toBeLessThanOrEqual(1.5);
        await figure.screenshot({ path: path.join(output, `${viewport.name}-sculpture-ring.png`) });
        return { viewport, stats };
      });
      await check(`${viewport.name}-selection-original-values`, async () => {
        const originalLabels = await choices.allTextContents();
        if (viewport.name === 'desktop') {
          await choices.nth(0).focus();
          await page.keyboard.press('ArrowRight');
          await expect(choices.nth(1)).toBeFocused();
        } else await choices.nth(1).tap();
        await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
        await expect(figure.locator('[aria-live]')).toContainText('En revisión');
        expect(await choices.allTextContents()).toEqual(originalLabels);
        if (viewport.name === 'desktop') {
          await page.keyboard.press('End');
          await expect(choices.nth(2)).toBeFocused();
          await page.keyboard.press('Home');
          await expect(choices.nth(0)).toBeFocused();
        }
        return { labels: originalLabels, input: viewport.name === 'desktop' ? 'Arrow keys, Home, End' : 'Touch on legend control' };
      });
      await check(`${viewport.name}-renderer-rest`, async () => {
        await page.waitForTimeout(1100);
        const before = await frames(host);
        await page.waitForTimeout(1300);
        const after = await frames(host);
        expect(after).toBe(before);
        return { before, after, idleSampleMilliseconds: 1300 };
      });
      await check(`${viewport.name}-offscreen-pause`, async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(200);
        const before = await frames(host);
        await choices.nth(2).evaluate(button => button.click());
        await page.waitForTimeout(400);
        expect(await frames(host)).toBe(before);
        await figure.scrollIntoViewIfNeeded();
        await expect.poll(() => frames(host)).toBeGreaterThan(before);
        return { before, afterResume: await frames(host) };
      });
      if (viewport.name === 'desktop') {
        await check('webgl-context-loss-and-restoration', async () => {
          const available = await host.locator('canvas').evaluate(canvas => {
            const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
            if (!extension) return false;
            window.__atlasSculptureRestore = () => extension.restoreContext();
            extension.loseContext();
            return true;
          });
          expect(available).toBe(true);
          await expect(figure).toHaveAttribute('data-renderer', 'fallback');
          await expect(figure.locator('svg').first()).toBeVisible();
          await choices.nth(1).click();
          await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
          await figure.screenshot({ path: path.join(output, 'context-loss-svg.png') });
          await page.waitForTimeout(1500);
          await page.evaluate(() => { window.__atlasSculptureRestore(); delete window.__atlasSculptureRestore; });
          await ready(figure);
          await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
          return { controlsRemainOperable: true, rendererRestored: true };
        });
        await check('dashboard-real-pie-and-bars', async () => {
          await hospital(page);
          const results = [];
          for (const variant of ['pie', 'bars']) {
            if (variant === 'bars') await page.getByRole('button', { name: 'Volumen', exact: true }).click();
            const chart = page.locator(`[data-analytics-sculpture="${variant}"]`).first();
            await chart.scrollIntoViewIfNeeded();
            await ready(chart);
            await chart.screenshot({ path: path.join(output, `hospital-sculpture-${variant}.png`) });
            const stats = await statistics(chart.locator('[data-sculpture-host]'));
            results.push({ variant, stats, values: await chart.locator('tbody').allTextContents() });
          }
          return { results };
        });
        await check('pie-raycast-data-integrity-and-idle', async () => {
          await page.getByRole('button', { name: 'Distribución', exact: true }).click();
          const chart = page.locator('[data-analytics-sculpture="pie"]').first();
          await chart.scrollIntoViewIfNeeded();
          await ready(chart);
          const chartHost = chart.locator('[data-sculpture-host]');
          const chartChoices = chart.getByRole('group').getByRole('button');
          const labelsBefore = await chartChoices.allTextContents();
          const originalValues = await chart.locator('tbody td').allTextContents();
          const sourceValues = await page.evaluate(async () => {
            const session = JSON.parse(sessionStorage.getItem('atlas.session'));
            const response = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${session.token}` } });
            if (!response.ok) throw new Error(`Dashboard API ${response.status}`);
            const data = await response.json();
            return ['GREEN', 'YELLOW', 'RED'].map(lane => data.byLane[lane] || 0);
          });
          expect(originalValues.map(value => Number(value.replaceAll(',', '')))).toEqual(sourceValues);
          const box = await chartHost.boundingBox();
          const observedSelections = new Set();
          for (const [x, y] of [[.38,.40],[.6,.4],[.37,.61],[.62,.6],[.5,.47],[.48,.66]]) {
            await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
            await page.waitForTimeout(130);
            observedSelections.add(await chartChoices.evaluateAll(choices => choices.findIndex(choice => choice.getAttribute('aria-pressed') === 'true')));
          }
          expect(observedSelections.size).toBeGreaterThanOrEqual(2);
          expect(await chartChoices.allTextContents()).toEqual(labelsBefore);
          await page.mouse.move(0, 0);
          await page.waitForTimeout(1200);
          const before = await frames(chartHost);
          await page.waitForTimeout(1000);
          expect(await frames(chartHost)).toBe(before);
          await chart.screenshot({ path: path.join(output, 'hospital-pie-selected.png') });
          return { sourceValues, originalValues, observedSelections: [...observedSelections], idleFrames: 0, idleSampleMilliseconds: 1000 };
        });
        await check('navigation-mount-unmount-three-cycles', async () => {
          const cycles = [];
          for (let cycle = 0; cycle < 3; cycle++) {
            await page.goto('/', { waitUntil: 'networkidle' });
            const chart = page.locator('[data-analytics-sculpture]').first();
            await chart.scrollIntoViewIfNeeded();
            await ready(chart);
            expect(await page.locator('[data-sculpture-host] canvas').count()).toBe(1);
            const stats = await statistics(chart.locator('[data-sculpture-host]'));
            cycles.push({ cycle: cycle + 1, geometries: Number(stats.geometries), textures: Number(stats.textures), drawCalls: Number(stats.drawCalls) });
            await page.getByRole('link', { name: 'Privacidad', exact: true }).click();
            await expect(page.locator('[data-sculpture-host] canvas')).toHaveCount(0);
          }
          expect(new Set(cycles.map(cycle => cycle.geometries)).size).toBe(1);
          expect(new Set(cycles.map(cycle => cycle.textures)).size).toBe(1);
          return { cycles, limit: 'DOM teardown and equal renderer-owned resource counts after remount. This does not measure GPU memory or prove absence of every leak.' };
        });
      }
      if (viewport.name !== 'desktop') await check('mobile-pie-touch-and-exact-values', async () => {
        const chart = await hospital(page);
        await ready(chart);
        const chartChoices = chart.getByRole('group').getByRole('button');
        const valuesBefore = await chartChoices.allTextContents();
        await chartChoices.nth(1).tap();
        await expect(chartChoices.nth(1)).toHaveAttribute('aria-pressed', 'true');
        expect(await chartChoices.allTextContents()).toEqual(valuesBefore);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        await chart.screenshot({ path: path.join(output, 'mobile-hospital-pie.png') });
        return { values: valuesBefore, stats: await statistics(chart.locator('[data-sculpture-host]')) };
      });
    } finally { await context.close(); }
  }

  const reduced = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    const { page, figure, host, choices } = await openScene(reduced, false, true);
    await check('reduced-motion-from-first-load', async () => {
      await ready(figure);
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await expect(host).toHaveAttribute('data-motion', 'reduced');
      await page.waitForTimeout(200);
      const before = await frames(host);
      await choices.nth(2).click();
      await page.waitForTimeout(250);
      const after = await frames(host);
      expect(after - before).toBeLessThanOrEqual(2);
      const box = await host.boundingBox();
      await page.mouse.move(box.x + box.width * .1, box.y + box.height * .4);
      await page.mouse.move(box.x + box.width * .9, box.y + box.height * .4, { steps: 8 });
      await page.waitForTimeout(300);
      expect(await frames(host)).toBe(after);
      return { before, after, pointerFrames: 0 };
    });
    await check('pie-reduced-motion-keyboard', async () => {
      const chart = await hospital(page);
      await ready(chart);
      const chartHost = chart.locator('[data-sculpture-host]');
      await expect(chartHost).toHaveAttribute('data-motion', 'reduced');
      const chartChoices = chart.getByRole('group').getByRole('button');
      await chartChoices.nth(0).focus();
      const before = await frames(chartHost);
      await page.keyboard.press('ArrowRight');
      await expect(chartChoices.nth(1)).toBeFocused();
      await expect(chartChoices.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(200);
      expect(await frames(chartHost) - before).toBeLessThanOrEqual(2);
      return { selectionFrames: await frames(chartHost) - before, keyboardSelection: true };
    });
  } finally { await reduced.close(); }

  const fallback = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return getContext.call(this, type, ...args);
    };
  });
  try {
    const { page, figure, choices } = await openScene(fallback, true);
    await check('webgl-unavailable-svg-fallback', async () => {
      await expect(figure).toHaveAttribute('data-renderer', 'fallback');
      await expect(figure.locator('svg').first()).toBeVisible();
      await expect(figure.locator('canvas')).toHaveCount(0);
      await choices.nth(2).tap();
      await expect(choices.nth(2)).toHaveAttribute('aria-pressed', 'true');
      await expect(figure.locator('[aria-live]')).toContainText('Por resolver');
      await figure.screenshot({ path: path.join(output, 'mobile-svg-fallback.png') });
      return { failureInjected: 'Canvas WebGL context unavailable before app initialization', controlsRemainOperable: true };
    });
    await check('pie-svg-fallback-closed-sectors-and-selection', async () => {
      const chart = await hospital(page);
      await expect(chart).toHaveAttribute('data-renderer', 'fallback');
      await expect(chart.locator('canvas')).toHaveCount(0);
      const sectorPaths = await chart.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')).filter(Boolean));
      expect(sectorPaths.length).toBeGreaterThan(0);
      expect(sectorPaths.every(path => path.startsWith('M0 0L') && path.endsWith('Z'))).toBe(true);
      const chartChoices = chart.getByRole('group').getByRole('button');
      const values = await chartChoices.allTextContents();
      await chartChoices.nth(1).tap();
      await expect(chartChoices.nth(1)).toHaveAttribute('aria-pressed', 'true');
      expect(await chartChoices.allTextContents()).toEqual(values);
      await chart.screenshot({ path: path.join(output, 'mobile-pie-svg-fallback.png') });
      return { closedSectorPaths: sectorPaths.length, values, selectionWithoutWebGL: true };
    });
  } finally { await fallback.close(); }
} catch (error) {
  report.errors.push({ name: 'journey-setup', message: error.message });
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.errors.length === 0 && report.checks.length >= 13;
  await writeFile(path.join(output, 'sculpture-review.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors }, null, 2));
  await browser.close();
  process.exitCode = report.passed ? 0 : 1;
}
