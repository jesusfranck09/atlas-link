// Local laboratory observation, not a Core Web Vitals field report.
// Reuses the existing Chrome CDP endpoint; never launches or closes shared Chrome.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.ATLAS_PRODUCTION_URL || 'http://127.0.0.1:4430';
const output = path.join(root, 'evidence/glass-v6/performance-smoke.json');
const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  { name: 'mobile-emulated', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const report = {
  startedAt: new Date().toISOString(), baseURL,
  method: {
    environment: 'Docker production build on loopback; Chrome installed on macOS',
    repetitions: 3, routes: ['/', '/login'], observationAfterLoadMs: 2500,
    cache: 'New isolated browser context per navigation; CDP Network.setCacheDisabled=true',
    throttling: 'None: local network and host CPU; not representative of customer network or mobile CPU',
    mutations: 'None: public landing and login reads only; no login submissions',
    definitions: {
      ttfbMs: 'Navigation responseStart minus navigation start (includes connection setup)',
      serverResponseMs: 'Navigation responseStart minus requestStart',
      lcpMs: 'Last largest-contentful-paint entry during the observation window',
      cls: 'Maximum unexpected layout-shift session window: <1s gap and <5s duration',
      transferredBytes: 'Navigation plus resource timing transferSize; includes reported response headers',
      longTasks: 'PerformanceObserver longtask entries reported during the observation window',
    },
    limits: ['Small local laboratory sample, not field percentiles or a Lighthouse score', 'No CPU/network throttling; no real Windows, Android, iOS, or Safari device measurement', 'No INP measurement or interaction workload', 'CLS and LCP only cover initial navigation and observation window; no full session coverage', 'Fresh browser cache does not reset server, OS, image optimizer, or transport caches'],
  },
  staticInspection: {}, samples: [], summary: [], motion: [], errors: [],
};

function installObservers() {
  const data = { lcp: null, cls: 0, shifts: [], longTasks: [], supported: PerformanceObserver.supportedEntryTypes, observers: [], windowStart: 0, lastShift: 0, windowValue: 0 };
  function observe(type, callback) {
    if (!data.supported.includes(type)) return;
    const observer = new PerformanceObserver(list => callback(list.getEntries()));
    observer.observe({ type, buffered: true });
    data.observers.push({ observer, callback });
  }
  observe('largest-contentful-paint', entries => {
    for (const entry of entries) data.lcp = { time: entry.startTime, size: entry.size, tag: entry.element?.tagName || null };
  });
  observe('layout-shift', entries => {
    for (const entry of entries) {
      if (entry.hadRecentInput) continue;
      if (data.shifts.length > 0 && entry.startTime - data.lastShift < 1000 && entry.startTime - data.windowStart < 5000) data.windowValue += entry.value;
      else { data.windowStart = entry.startTime; data.windowValue = entry.value; }
      data.lastShift = entry.startTime;
      data.cls = Math.max(data.cls, data.windowValue);
      data.shifts.push({ time: entry.startTime, value: entry.value, sources: entry.sources?.map(source => ({ tag: source.node?.tagName, class: typeof source.node?.className === 'string' ? source.node.className : null, previous: source.previousRect.toJSON(), current: source.currentRect.toJSON() })) });
    }
  });
  observe('longtask', entries => {
    for (const entry of entries) data.longTasks.push({ time: entry.startTime, duration: entry.duration });
  });
  window.__atlasPerformance = data;
}

function collectSample() {
  const data = window.__atlasPerformance;
  for (const { observer, callback } of data.observers) callback(observer.takeRecords());
  const navigation = performance.getEntriesByType('navigation')[0];
  const resources = performance.getEntriesByType('resource').map(entry => ({
    path: new URL(entry.name).pathname, sameOrigin: new URL(entry.name).origin === location.origin,
    initiator: entry.initiatorType, transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize,
    durationMs: entry.duration, responseStatus: entry.responseStatus ?? null,
  }));
  const groups = {};
  for (const resource of resources) {
    const type = resource.path.endsWith('.woff2') ? 'font' : resource.path.endsWith('.js') ? 'script' : resource.path.endsWith('.css') ? 'css' : resource.path.startsWith('/_next/image') || /\.(jpg|svg|png|webp)$/.test(resource.path) ? 'image' : resource.path.startsWith('/api/') ? 'api' : 'other';
    groups[type] ??= { count: 0, transferredBytes: 0, encodedBytes: 0, decodedBytes: 0 };
    groups[type].count++;
    groups[type].transferredBytes += resource.transferSize;
    groups[type].encodedBytes += resource.encodedBodySize;
    groups[type].decodedBytes += resource.decodedBodySize;
  }
  return {
    observationMs: performance.now(), visibility: document.visibilityState,
    ttfbMs: navigation.responseStart, serverResponseMs: navigation.responseStart - navigation.requestStart,
    domContentLoadedMs: navigation.domContentLoadedEventEnd, loadMs: navigation.loadEventEnd,
    firstContentfulPaintMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    lcpMs: data.lcp?.time ?? null, lcpElement: data.lcp?.tag ?? null, cls: data.cls,
    longTaskCount: data.longTasks.length, longTaskTotalMs: data.longTasks.reduce((sum, task) => sum + task.duration, 0),
    longestTaskMs: Math.max(0, ...data.longTasks.map(task => task.duration)), longTasks: data.longTasks,
    transferredBytes: navigation.transferSize + resources.reduce((sum, resource) => sum + resource.transferSize, 0),
    documentTransferBytes: navigation.transferSize, resourceCount: resources.length, groups, resources,
    observersSupported: data.supported, layoutShifts: data.shifts,
    viewport: { width: innerWidth, documentWidth: document.documentElement.scrollWidth },
    canvasCount: document.querySelectorAll('canvas').length,
  };
}

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
let browser;
try {
  const manifest = JSON.parse(await readFile(path.join(root, 'frontend/package.json'), 'utf8'));
  const css = await readFile(path.join(root, 'frontend/src/app/globals.css'), 'utf8');
  report.staticInspection = {
    dependencies: manifest.dependencies,
    cssSourceBytes: Buffer.byteLength(css),
    heroPhotoBytes: (await stat(path.join(root, 'frontend/public/images/hospital-architecture.jpg'))).size,
    scene: 'Three.js loaded on intersection; on-demand rendering and SVG fallback; actual canvas count recorded in each sample',
    reducedMotionRulePresent: /prefers-reduced-motion\s*:\s*reduce/.test(css),
    reducedMotionImplementation: 'Runtime animation state and scroll behavior verified below',
    fonts: 'Geist Variable WOFF2 hosted locally with font-display swap; browser chooses unicode subsets',
    photo: 'Locally hosted real photography, responsive Next Image',
    localBuild: { note: 'Runtime is the Docker build; host .next is a separate development tree and is not measured as deployment output.' },
  };
  browser = await chromium.connectOverCDP(process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9430');
  report.browserVersion = browser.version();
  for (const { name, ...options } of viewports) {
    for (const route of report.method.routes) {
      for (let repetition = 1; repetition <= report.method.repetitions; repetition++) {
        const context = await browser.newContext({ ...options, reducedMotion: 'no-preference', locale: 'es-MX', timezoneId: 'America/Mexico_City' });
        try {
          await context.addInitScript(installObservers);
          const page = await context.newPage();
          const client = await context.newCDPSession(page);
          await client.send('Network.enable');
          await client.send('Network.setCacheDisabled', { cacheDisabled: true });
          page.on('pageerror', error => report.errors.push({ viewport: name, route, repetition, message: error.message }));
          const response = await page.goto(new URL(route, baseURL).href, { waitUntil: 'load', timeout: 30000 });
          await page.evaluate(async () => { await document.fonts.ready; });
          await page.waitForTimeout(report.method.observationAfterLoadMs);
          const measurement = await page.evaluate(collectSample);
          report.samples.push({ ...measurement, viewport: name, dimensions: measurement.viewport, route, repetition, httpStatus: response.status(), documentEtag: response.headers().etag || null });
          if (response.status() !== 200 || measurement.lcpMs === null || measurement.visibility !== 'visible') report.errors.push({ viewport: name, route, repetition, message: 'Incomplete measurement: HTTP, LCP, or visibility' });
        } finally { await context.close(); }
      }
    }
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce', locale: 'es-MX' });
    try {
      const page = await context.newPage();
      await page.goto(baseURL, { waitUntil: 'load' });
      await page.waitForTimeout(2600);
      const motion = await page.evaluate(() => ({
        preference: matchMedia('(prefers-reduced-motion: reduce)').matches,
        activeAnimations: document.getAnimations().map(animation => ({ playState: animation.playState, iterations: String(animation.effect?.getTiming().iterations), duration: animation.effect?.getTiming().duration })),
        scene: [...document.querySelectorAll('[data-scene-perspective]')].map(element => ({ duration: getComputedStyle(element).animationDuration, iterations: getComputedStyle(element).animationIterationCount, transform: getComputedStyle(element).transform })),
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      }));
      report.motion.push({ viewport: name, ...motion });
      if (!motion.preference || motion.activeAnimations.some(animation => animation.iterations === 'Infinity') || motion.scrollBehavior !== 'auto') report.errors.push({ viewport: name, message: 'Reduced motion check failed' });
    } finally { await context.close(); }
  }
  for (const { name } of viewports) for (const route of report.method.routes) {
    const samples = report.samples.filter(sample => sample.viewport === name && sample.route === route);
    const entry = { viewport: name, route, samples: samples.length };
    for (const metric of ['ttfbMs', 'lcpMs', 'cls', 'longTaskCount', 'longTaskTotalMs', 'transferredBytes', 'resourceCount']) {
      const values = samples.map(sample => sample[metric]);
      entry[metric] = { median: median(values), min: Math.min(...values), max: Math.max(...values) };
    }
    report.summary.push(entry);
  }
} catch (error) { report.errors.push({ message: error.message }); }
finally {
  report.finishedAt = new Date().toISOString();
  report.completed = report.samples.length === 12 && report.summary.length === 4 && report.summary.every(entry => entry.samples === 3 && Number.isFinite(entry.lcpMs.median)) && report.motion.length === 2 && report.errors.length === 0;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ completed: report.completed, samples: report.samples.length, summary: report.summary, motion: report.motion, errors: report.errors }, null, 2));
  // Exit disconnects this Playwright client; shared Chrome and others' contexts remain running.
  process.exit(report.completed ? 0 : 1);
}
