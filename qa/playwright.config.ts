import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  outputDir: '../evidence/browser-results',
  reporter: [ ['list'], ['json', { outputFile: '../evidence/browser-report.json' }], ['html', { outputFolder: '../evidence/browser-report', open: 'never' }] ],
  use: {
    baseURL: process.env.ATLAS_WEB_URL || 'http://127.0.0.1:4300',
    channel: 'chrome',
    headless: true,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    screenshot: 'only-on-failure',
    // Traces can contain bearer tokens and synthetic credentials; use safe JSON + screenshots.
    trace: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chrome-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'chrome-mobile-emulated', testMatch: '**/journeys.spec.ts', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
});
