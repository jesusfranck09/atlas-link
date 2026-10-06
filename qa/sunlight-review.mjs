// V11 targeted review. Run after "V11 desplegado" and exclusive CDP handoff.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4430';
const output = path.join(root, 'evidence/sunlight-v11/after');
const sizes = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'tablet-1024', viewport: { width: 1024, height: 768 }, hasTouch: true },
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'mobile-320', viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true },
];
const fixedTime = hour => new Date(`2026-09-24T${hour}:00:00-06:00`);
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER) : null;
const report = {
  startedAt: new Date().toISOString(), baseURL,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workingTree: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean),
  scope: 'New fixed V11 illumination and compact landing hero. Actual local demo authentication and read-only accounts/reports. Checks scroll, visible compositing on opaque content, text selection, input/click access, menu/dialog stacking and accessibility preferences.',
  reusedEvidence: ['evidence/premium-v10/after/review.json', 'evidence/premium-v10/after/smoke/report.json'],
  limits: 'Chrome on macOS with emulated mobile/tablet dimensions. No physical mobile, other browser, FPS or battery claims. Axe has limits on gradients/canvas; visual screenshots and pixel comparisons complement it. Business data, lead submissions and production are excluded.',
  checks: [], errors: [],
};
const sanitize = value => String(value).replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]').replace(/AtlasDemo\d+!/g, '[DEMO_PASSWORD]');
const owned = new Set();
let browser;
let planned = 0;

async function scenario(name, size, action) {
  if (filter && !filter.test(name)) return;
  planned++;
  const { name: ignored, ...options } = size;
  const context = await browser.newContext({ locale: 'es-MX', timezoneId: 'America/Mexico_City', ...options });
  owned.add(context);
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.errors.push({ name, kind: 'pageerror', message: sanitize(error.message) }));
    page.on('console', event => { if (event.type() === 'error') report.errors.push({ name, kind: 'console', message: sanitize(event.text()) }); });
    const result = await action(page);
    report.checks.push({ name, status: 'pass', ...result });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, status: 'fail', message: sanitize(error.message) });
    console.log(`FAIL ${name}: ${sanitize(error.message).split('\n')[0]}`);
  } finally { await context.close(); owned.delete(context); }
}

async function chartReady(page) {
  await page.evaluate(() => document.fonts.ready);
  for (const chart of await page.locator('[data-analytics-sculpture]').all()) {
    const box = await chart.locator('[data-sculpture-host]').evaluate(el => {
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    const visibleHeight = Math.max(0, Math.min(box.y + box.height, page.viewportSize().height) - Math.max(box.y, 0));
    if (visibleHeight > 0) {
      await expect(chart).not.toHaveAttribute('data-renderer', 'loading');
    }
  }
}

async function capture(page, name) {
  await chartReady(page);
  await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled', caret: 'hide' });
  return `evidence/sunlight-v11/after/${name}.png`;
}

async function light(page, surface, phase = 'day') {
  await expect(page.locator('[data-daylight]')).toHaveAttribute('data-daylight', phase);
  const overlay = page.locator(`[data-daylight-overlay][data-surface="${surface}"]`);
  await expect(overlay).toHaveCount(1);
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  await expect(overlay).toHaveCSS('pointer-events', 'none');
  await expect(overlay).toHaveCSS('position', 'fixed');
  await expect.poll(() => overlay.evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
  const layout = await overlay.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width, height: r.height, viewportHeight: innerHeight, viewportWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth, scrollY, zIndex: getComputedStyle(el).zIndex, opacity: getComputedStyle(el).opacity };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(Math.abs(layout.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.left)).toBeLessThanOrEqual(1);
  expect(layout.height).toBeGreaterThanOrEqual(layout.viewportHeight - 1);
  expect(layout.width).toBeGreaterThanOrEqual(layout.viewportWidth - 1);
  return layout;
}

async function contrast(page, selectors) {
  let builder = new AxeBuilder({ page }).withRules(['color-contrast']);
  for (const selector of selectors) builder = builder.include(selector);
  const result = await builder.analyze();
  const violations = result.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
  expect(violations).toEqual([]);
  return { violations, incomplete: result.incomplete.map(item => ({ id: item.id, nodeCount: item.nodes.length })) };
}

async function selectText(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.evaluate(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      const rect = range.getClientRects()[0];
      if (rect?.width > 20) return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }
    return null;
  });
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + 1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(box.width - 1, 190), box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  const selection = await page.evaluate(() => window.getSelection()?.toString() || '');
  expect(selection.trim().length).toBeGreaterThan(0);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  return { mouseSelectionWorks: true, selectedCharacters: selection.length };
}

async function paintedContent(page, target, name) {
  await target.scrollIntoViewIfNeeded();
  await chartReady(page);
  const bounds = await target.boundingBox();
  const viewport = page.viewportSize();
  const region = { x: Math.max(0, bounds.x), y: Math.max(0, bounds.y), right: Math.min(viewport.width, bounds.x + bounds.width), bottom: Math.min(viewport.height, bounds.y + bounds.height) };
  expect(region.right - region.x).toBeGreaterThan(20);
  expect(region.bottom - region.y).toBeGreaterThan(20);
  const on = await page.screenshot({ path: path.join(output, `${name}-light-on.png`), animations: 'disabled', caret: 'hide' });
  let off;
  const style = await page.addStyleTag({ content: '[data-daylight-overlay] { visibility: hidden !important; }' });
  try { off = await page.screenshot({ path: path.join(output, `${name}-light-off.png`), animations: 'disabled', caret: 'hide' }); }
  finally { await style.evaluate(el => el.remove()); }
  const comparison = await page.evaluate(async ({ on, off, region }) => {
    async function pixels(base64) {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return { width: image.width, data: ctx.getImageData(0, 0, image.width, image.height).data };
    }
    const [a, b] = await Promise.all([pixels(on), pixels(off)]);
    let changedPixels = 0, totalPixels = 0, absoluteDifference = 0, maxChannelDifference = 0;
    for (let y = Math.ceil(region.y); y < Math.floor(region.bottom); y++) for (let x = Math.ceil(region.x); x < Math.floor(region.right); x++) {
      let changed = false; totalPixels++;
      for (let channel = 0; channel < 3; channel++) {
        const index = (y * a.width + x) * 4 + channel;
        const difference = Math.abs(a.data[index] - b.data[index]);
        absoluteDifference += difference; maxChannelDifference = Math.max(maxChannelDifference, difference); changed ||= difference > 0;
      }
      if (changed) changedPixels++;
    }
    return { changedPixels, totalPixels, meanChannelDifference: absoluteDifference / (totalPixels * 3), maxChannelDifference };
  }, { on: on.toString('base64'), off: off.toString('base64'), region });
  expect(comparison.changedPixels, 'The new overlay must paint on the inspected content, not only behind its opaque background').toBeGreaterThan(0);
  return { region, ...comparison, mechanism: 'Same viewport/clock, screenshot with only data-daylight-overlay hidden transiently for comparison; restored immediately', images: [`${name}-light-on.png`, `${name}-light-off.png`] };
}

async function preferences(page) {
  const selector = '[data-daylight], [data-daylight-overlay], [data-celestial]';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const transitions = await page.locator(selector).evaluateAll(roots => roots.flatMap(root => [root, ...root.querySelectorAll('*')]).flatMap(el => [null, '::before', '::after'].map(pseudo => {
    const s = getComputedStyle(el, pseudo);
    return { drawn: !pseudo || !['none', 'normal'].includes(s.content), property: s.transitionProperty, duration: s.transitionDuration };
  })).filter(item => item.drawn));
  expect(transitions.every(item => item.property === 'none' || item.duration.split(',').every(value => parseFloat(value) === 0))).toBe(true);
  const running = await page.locator(selector).evaluateAll(roots => roots.reduce((sum, root) => sum + root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length, 0));
  expect(running).toBe(0);
  await page.emulateMedia({ forcedColors: 'active' });
  for (const el of await page.locator(selector).all()) await expect(el).toHaveCSS('display', 'none');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  return { reducedMotionTransitionsDisabled: true, runningLightAnimations: running, forcedColorsHidden: true };
}

async function login(page) {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-daylight-overlay]')).toHaveCount(0);
  await page.getByTestId('demo-hospital_admin').click();
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('[data-system-cover]')).toBeVisible();
}

try {
  await mkdir(output, { recursive: true });
  browser = await chromium.connectOverCDP(process.env.QA_CDP_URL || 'http://127.0.0.1:9430');
  report.browser = browser.version();
  for (const size of sizes) await scenario(`landing-day-${size.name}`, size, async page => {
    await page.clock.setFixedTime(fixedTime('14'));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Cada cuenta,\s*en perspectiva\.$/);
    await expect(page.locator('[data-hero-eyebrow]')).toHaveText('Preauditoría hospitalaria');
    await expect(page.getByRole('link', { name: 'Explorar plataforma', exact: true })).toHaveAttribute('href', '/login');
    await expect(page.getByRole('link', { name: 'Contactar', exact: true })).toHaveAttribute('href', '#contacto');
    const topLight = await light(page, 'landing');
    const hero = await page.locator('[data-hero-intro]').evaluate(el => {
      const heading = el.querySelector('h1');
      const image = document.querySelector('img[alt="Arquitectura hospitalaria con lucernarios circulares y luz natural"]');
      const r = heading.getBoundingClientRect(); const p = image.getBoundingClientRect();
      return { fontSize: getComputedStyle(heading).fontSize, headingHeight: r.height, headingBottom: r.bottom, photoTop: p.top, visiblePhotoHeight: Math.max(0, Math.min(p.bottom, innerHeight) - Math.max(p.top, 0)), viewportHeight: innerHeight };
    });
    expect(hero.visiblePhotoHeight).toBeGreaterThan(0);
    expect(hero.photoTop).toBeGreaterThanOrEqual(hero.headingBottom);
    const heroScreenshot = await capture(page, `landing-day-${size.name}`);
    const selection = size.isMobile ? undefined : await selectText(page, page.getByRole('heading', { level: 1 }));
    if (size.isMobile) {
      await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Cerrar navegación', exact: true })).toHaveAttribute('aria-expanded', 'true');
      const navZ = await page.locator('header').evaluate(el => Number(getComputedStyle(el).zIndex));
      expect(navZ).toBeGreaterThan(Number(topLight.zIndex));
      await page.getByRole('button', { name: 'Cerrar navegación', exact: true }).click();
    }
    await page.getByRole('link', { name: 'Contactar', exact: true }).click();
    await page.locator('#contacto form').scrollIntoViewIfNeeded();
    const bottomLight = await light(page, 'landing');
    expect(bottomLight.scrollY).toBeGreaterThan(topLight.scrollY);
    const input = page.getByRole('textbox', { name: /^Correo de trabajo(?:\s*\*)?$/ });
    await input.fill('qa-v11@example.invalid');
    await expect(input).toHaveValue('qa-v11@example.invalid');
    await input.clear();
    const painted = await paintedContent(page, page.locator('#contacto form'), `contact-day-${size.name}`);
    const axe = await contrast(page, ['[data-hero-intro]', '#contacto']);
    const media = size.name === 'desktop' ? await preferences(page) : undefined;
    return { hero, topLight, bottomLight, heroScreenshot, contactInputWorks: true, painted, axe, ...(selection ? { selection } : {}), ...(media ? { media } : {}) };
  });

  for (const size of sizes) await scenario(`hospital-day-${size.name}`, size, async page => {
    await page.clock.setFixedTime(fixedTime('14'));
    await login(page);
    const topLight = await light(page, 'workspace');
    const dashboardScreenshot = await capture(page, `hospital-day-${size.name}`);
    if (size.isMobile) {
      await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'Módulos del espacio' });
      expect(await drawer.evaluate(el => Number(getComputedStyle(el).zIndex))).toBeGreaterThan(Number(topLight.zIndex));
      await drawer.getByRole('button', { name: 'Centro de ayuda', exact: true }).click();
    } else await page.getByRole('button', { name: 'Centro de ayuda', exact: true }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tu espacio, paso a paso' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(el => el.matches(':modal'))).toBe(true);
    await capture(page, `hospital-help-${size.name}`);
    await page.getByRole('button', { name: 'Entendido', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.goto(`${baseURL}/hospital/accounts`, { waitUntil: 'domcontentloaded' });
    const region = page.getByRole('region', { name: 'Tabla de cuentas hospitalarias', exact: true });
    await expect(region).toBeVisible();
    const tab = page.getByRole('button', { name: 'Por revisar', exact: true });
    await tab.click(); await expect(tab).toHaveAttribute('aria-pressed', 'true');
    await expect(region).toBeVisible();
    const accountScreenshot = await capture(page, `hospital-accounts-${size.name}`);
    await page.goto(`${baseURL}/hospital/reports`, { waitUntil: 'domcontentloaded' });
    const summary = page.getByRole('region', { name: 'Resumen por aseguradora', exact: true });
    await expect(summary).toBeVisible();
    await summary.scrollIntoViewIfNeeded();
    const lowerLight = await light(page, 'workspace');
    const selection = size.isMobile ? undefined : await selectText(page, page.getByRole('heading', { name: 'Detalle por aseguradora', exact: true }));
    const painted = await paintedContent(page, summary, `report-table-${size.name}`);
    const axe = await contrast(page, ['[data-workspace] main']);
    const media = size.name === 'mobile-320' ? await preferences(page) : undefined;
    return { topLight, lowerLight, dashboardScreenshot, accountScreenshot, menuAndNativeModalWork: true, laneTabWorks: true, painted, axe, ...(selection ? { selection } : {}), ...(media ? { media } : {}) };
  });

  for (const size of [sizes[0], sizes[3]]) await scenario(`landing-night-${size.name}`, size, async page => {
    await page.clock.setFixedTime(fixedTime('21'));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const topLight = await light(page, 'landing', 'night');
    const heroScreenshot = await capture(page, `landing-night-${size.name}`);
    await page.locator('#contacto form').scrollIntoViewIfNeeded();
    const bottomLight = await light(page, 'landing', 'night');
    const screenshot = await capture(page, `contact-night-${size.name}`);
    const axe = await contrast(page, ['[data-hero-intro]', '#contacto']);
    return { topLight, bottomLight, heroScreenshot, screenshot, axe };
  });

  await scenario('hospital-night-mobile-390', sizes[2], async page => {
    await page.clock.setFixedTime(fixedTime('21'));
    await login(page);
    await page.goto(`${baseURL}/hospital/reports`, { waitUntil: 'domcontentloaded' });
    const summary = page.getByRole('region', { name: 'Resumen por aseguradora', exact: true });
    await expect(summary).toBeVisible(); await summary.scrollIntoViewIfNeeded();
    const layout = await light(page, 'workspace', 'night');
    const screenshot = await capture(page, 'report-night-mobile-390');
    const axe = await contrast(page, ['[data-workspace] main']);
    return { layout, screenshot, axe };
  });

  for (const size of sizes.slice(0, 2)) await scenario(`sunset-hero-geometry-${size.name}`, size, async page => {
    await page.clock.setFixedTime(fixedTime('17'));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await light(page, 'landing', 'sunset');
    const screenshot = await capture(page, `landing-sunset-${size.name}`);
    const result = await page.evaluate(() => {
      const orb = document.querySelector('[data-surface="landing"] [data-daylight-orb]');
      const r = orb.getBoundingClientRect(); const style = getComputedStyle(orb, '::before');
      const length = (value, size) => value.endsWith('%') ? parseFloat(value) / 100 * size : parseFloat(value);
      const x = r.x + (length(style.left, r.width) || 0), y = r.y + (length(style.top, r.height) || 0);
      const width = length(style.width, r.width) || r.width, height = length(style.height, r.height) || r.height;
      const disk = { x, y, width, height, right: x + width, bottom: y + height };
      const intersects = other => disk.x < other.right && disk.right > other.left && disk.y < other.bottom && disk.bottom > other.top;
      const targets = [...document.querySelectorAll('[data-hero-intro] h1, [data-hero-intro] p, [data-hero-intro] a')];
      const collisions = targets.filter(el => {
        if (el.tagName === 'A') return intersects(el.getBoundingClientRect());
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          if ([...range.getClientRects()].some(intersects)) return true;
        }
        return false;
      }).map(el => el.textContent.trim());
      const photo = document.querySelector('img[alt="Arquitectura hospitalaria con lucernarios circulares y luz natural"]').getBoundingClientRect();
      return { disk, collisions, opacity: style.opacity, photoTop: photo.top, photoClearance: photo.top - disk.bottom, viewportWidth: innerWidth, checked: 'Eyebrow, actual heading/paragraph text lines, both CTA rectangles, and desktop disk clearance above photograph' };
    });
    expect(Number(result.opacity)).toBeGreaterThan(0);
    expect(result.collisions).toEqual([]);
    if (size.viewport.width > 1100) expect(result.photoClearance, 'Full desktop sunset disk must clear the photograph by at least 16px').toBeGreaterThanOrEqual(16);
    return { ...result, screenshot };
  });
} catch (error) {
  report.checks.push({ name: 'runner', status: 'block', message: sanitize(error.message) });
} finally {
  for (const context of owned) await context.close().catch(() => {});
  report.finishedAt = new Date().toISOString();
  report.filter = process.env.QA_FILTER || null;
  report.plannedChecks = planned;
  report.totals = { pass: report.checks.filter(c => c.status === 'pass').length, fail: report.checks.filter(c => c.status === 'fail').length, block: report.checks.filter(c => c.status === 'block').length };
  report.passed = planned > 0 && report.totals.pass === planned && !report.totals.fail && !report.totals.block && !report.errors.length;
  await writeFile(path.join(output, process.env.QA_REPORT_FILE || 'review.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, totals: report.totals, errors: report.errors }, null, 2));
  process.exit(report.passed ? 0 : 1);
}
