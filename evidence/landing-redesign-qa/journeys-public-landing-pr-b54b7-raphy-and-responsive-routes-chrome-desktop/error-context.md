# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys.spec.ts >> public landing presents a labeled demo, real photography and responsive routes
- Location: tests/journeys.spec.ts:80:1

# Error details

```
Error: Axe serious/critical accessibility findings

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 24

- Array []
+ Array [
+   Object {
+     "count": 13,
+     "examples": Array [
+       Array [
+         ".landing-module__mMnuAW__heroIndex > span:nth-child(2)",
+       ],
+       Array [
+         ".landing-module__mMnuAW__accountHeader > div > span",
+       ],
+       Array [
+         ".landing-module__mMnuAW__accountSummary > div:nth-child(1) > span",
+       ],
+       Array [
+         "small",
+       ],
+       Array [
+         ".landing-module__mMnuAW__accountSummary > div:nth-child(2) > span",
+       ],
+     ],
+     "id": "color-contrast",
+     "impact": "serious",
+   },
+ ]
```

```
Error: Axe serious/critical accessibility findings

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 24

- Array []
+ Array [
+   Object {
+     "count": 12,
+     "examples": Array [
+       Array [
+         ".landing-module__mMnuAW__accountHeader > div > span",
+       ],
+       Array [
+         ".landing-module__mMnuAW__accountSummary > div:nth-child(1) > span",
+       ],
+       Array [
+         "small",
+       ],
+       Array [
+         ".landing-module__mMnuAW__accountSummary > div:nth-child(2) > span",
+       ],
+       Array [
+         ".landing-module__mMnuAW__tableHead > span:nth-child(1)",
+       ],
+     ],
+     "id": "color-contrast",
+     "impact": "serious",
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - link "Atlas Link, inicio" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e10]: atlaslink.
      - link "Consola Atlas" [ref=e11] [cursor=pointer]:
        - /url: /admin/login
    - generic [ref=e15]:
      - region [ref=e16]:
        - generic [ref=e17]: Portal hospitalario
        - heading "Bienvenido." [level=1] [ref=e18]
        - generic [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]: Correo institucional
            - textbox "Correo institucional" [ref=e25]:
              - /placeholder: tu.nombre@hospital.mx
          - generic [ref=e26]:
            - generic [ref=e27]: Contraseña
            - generic [ref=e28]:
              - textbox "Contraseña" [ref=e31]:
                - /placeholder: Tu contraseña
              - button "Mostrar contraseña" [ref=e32] [cursor=pointer]
          - button "Iniciar sesión" [ref=e35] [cursor=pointer]
      - region [ref=e38]:
        - heading "Usuarios demo" [level=2] [ref=e39]
        - paragraph [ref=e40]: Selecciona un rol para completar el correo y la contraseña. Después, pulsa Iniciar sesión. Los datos son ficticios.
        - generic [ref=e41]:
          - button "Administrador del hospital, Ana Beltrán, admin@demo.atlaslink.mx" [ref=e42] [cursor=pointer]:
            - generic [ref=e46]: Administración
            - generic [ref=e47]: admin@demo.atlaslink.mx
          - button "Caja y facturación, Camila Vega, caja@demo.atlaslink.mx" [ref=e48] [cursor=pointer]:
            - generic [ref=e52]: Caja y facturación
            - generic [ref=e53]: caja@demo.atlaslink.mx
          - button "Auditor hospitalario, Diego Navarro, auditor@demo.atlaslink.mx" [ref=e54] [cursor=pointer]:
            - generic [ref=e58]: Auditoría
            - generic [ref=e59]: auditor@demo.atlaslink.mx
          - button "Dirección del hospital, Elena Robles, direccion@demo.atlaslink.mx" [ref=e60] [cursor=pointer]:
            - generic [ref=e64]: Dirección
            - generic [ref=e65]: direccion@demo.atlaslink.mx
          - button "Aseguradora · lectura, Santiago Cruz, aseguradora@demo.atlaslink.mx" [ref=e66] [cursor=pointer]:
            - generic [ref=e70]: Aseguradora · lectura
            - generic [ref=e71]: aseguradora@demo.atlaslink.mx
          - button "Cuenta desactivada, baja@demo.atlaslink.mx" [ref=e72] [cursor=pointer]:
            - generic [ref=e76]: Cuenta desactivada
            - generic [ref=e77]: baja@demo.atlaslink.mx
    - generic [ref=e79]:
      - generic [ref=e80]: © 2026 Atlas Link
      - link "Todos los espacios" [ref=e81] [cursor=pointer]:
        - /url: /#espacios
      - link "Privacidad y datos" [ref=e82] [cursor=pointer]:
        - /url: /privacidad
  - alert [ref=e83]
```

# Test source

```ts
  1   | import { test as base, expect, chromium, type Page, type TestInfo } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | import { randomUUID } from 'node:crypto';
  4   | import { execFileSync } from 'node:child_process';
  5   | import { readFile } from 'node:fs/promises';
  6   | import path from 'node:path';
  7   | 
  8   | const test = base.extend<{ diagnostics: void }>({
  9   |   browser: [async ({}, use) => {
  10  |     const sharedEndpoint = process.env.ATLAS_CDP_URL;
  11  |     const browser = sharedEndpoint
  12  |       ? await chromium.connectOverCDP(sharedEndpoint)
  13  |       : await chromium.launch({ channel: 'chrome', headless: true });
  14  |     await use(browser);
  15  |     // Preserve a browser shared through CDP; test contexts are closed by Playwright.
  16  |     if (!sharedEndpoint) await browser.close();
  17  |   }, { scope: 'worker' }],
  18  |   diagnostics: [async ({ page }, use, testInfo) => {
  19  |     const consoleErrors: string[] = [];
  20  |     const pageErrors: string[] = [];
  21  |     const serverErrors: { url: string; status: number }[] = [];
  22  |     page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 1200)); });
  23  |     page.on('pageerror', error => pageErrors.push(error.message));
  24  |     page.on('response', response => { if (response.status() >= 500 && ['127.0.0.1', 'localhost'].includes(new URL(response.url()).hostname)) serverErrors.push({ url: new URL(response.url()).pathname, status: response.status() }); });
  25  |     await use();
  26  |     await testInfo.attach('browser-diagnostics.json', { body: JSON.stringify({ browser: 'installed Google Chrome / Chromium engine', platform: process.platform, emulation: testInfo.project.name, consoleErrors, pageErrors, serverErrors }, null, 2), contentType: 'application/json' });
  27  |     expect(pageErrors, 'No uncaught browser exceptions').toEqual([]);
  28  |     expect(serverErrors, 'No local server 5xx during browser journey').toEqual([]);
  29  |   }, { auto: true }],
  30  | });
  31  | 
  32  | const unique = (prefix: string) => `QA-UI-${prefix}-${randomUUID().slice(0, 8)}`;
  33  | async function ready(page: Page) {
  34  |   await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  35  |   await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
  36  | }
  37  | async function screenshot(page: Page, info: TestInfo, name: string) {
  38  |   await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true, animations: 'disabled', caret: 'initial' });
  39  |   await info.attach(name, { path: info.outputPath(`${name}.png`), contentType: 'image/png' });
  40  | }
  41  | async function noOverflow(page: Page) {
  42  |   const metrics = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  43  |   expect(metrics.scrollWidth, 'Document must fit the viewport; tables may scroll internally').toBeLessThanOrEqual(metrics.width + 1);
  44  | }
  45  | async function a11y(page: Page, info: TestInfo, name: string) {
  46  |   const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  47  |   await info.attach(`${name}-axe.json`, { body: JSON.stringify({ url: new URL(page.url()).pathname, violations: results.violations, incomplete: results.incomplete, passes: results.passes.map(p => p.id) }, null, 2), contentType: 'application/json' });
> 48  |   expect.soft(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, examples: v.nodes.slice(0, 5).map(n => n.target) })), 'Axe serious/critical accessibility findings').toEqual([]);
      |                                                                                                                                                                                                                                                                     ^ Error: Axe serious/critical accessibility findings
  49  | }
  50  | async function login(page: Page, email = 'admin@demo.atlaslink.mx', password = 'AtlasDemo2026!') {
  51  |   const platform = email === 'atlas@demo.atlaslink.mx';
  52  |   await page.goto(platform ? '/admin/login' : '/login');
  53  |   const card = page.getByRole('button').filter({ has: page.getByText(email, { exact: true }) });
  54  |   if (email.endsWith('@demo.atlaslink.mx') && email !== 'otro@demo.atlaslink.mx') {
  55  |     await expect(card).toBeVisible();
  56  |     await card.click();
  57  |     await expect(page.getByLabel('Correo institucional')).toHaveValue(email);
  58  |     await expect(page.locator('input[name="password"]')).toHaveValue(password);
  59  |   } else {
  60  |     await page.getByLabel('Correo institucional').fill(email);
  61  |     await page.locator('input[name="password"]').fill(password);
  62  |   }
  63  |   await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  64  |   await expect(page).toHaveURL(platform ? /\/admin$/ : /\/hospital$/);
  65  |   await expect(page.locator('[data-system-cover]')).toBeVisible();
  66  | }
  67  | async function token(page: Page) {
  68  |   return page.evaluate(() => JSON.parse(sessionStorage.getItem('atlas.session') || '{}').token as string);
  69  | }
  70  | async function api(page: Page, endpoint: string) {
  71  |   const response = await page.request.get(`/api${endpoint}`, { headers: { Authorization: `Bearer ${await token(page)}` } });
  72  |   expect(response.ok(), `GET ${endpoint}: ${response.status()}`).toBeTruthy();
  73  |   return response.json();
  74  | }
  75  | async function openMenuIfMobile(page: Page) {
  76  |   const menu = page.getByRole('button', { name: 'Abrir menú', exact: true });
  77  |   if (await menu.isVisible()) await menu.click();
  78  | }
  79  | 
  80  | test('public landing presents a labeled demo, real photography and responsive routes', async ({ page }, info) => {
  81  |   await page.goto('/');
  82  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Claridad antes\s*de cada envío\./);
  83  |   const donut = page.locator('figure[data-landing-donut]');
  84  |   await expect(donut).toHaveAttribute('aria-label', 'Distribución ilustrativa de cuentas');
  85  |   await expect(donut.getByText('Datos sintéticos de demostración.')).toBeVisible();
  86  |   await expect(donut.locator('svg')).toHaveCount(1);
  87  |   for (const [label, percentage] of [['Preparadas', '60 %'], ['En revisión', '25 %'], ['Por resolver', '15 %']]) {
  88  |     await expect(donut.getByText(label, { exact: true })).toBeVisible();
  89  |     await expect(donut.getByText(percentage, { exact: true })).toBeVisible();
  90  |   }
  91  |   const photograph = page.getByRole('img', { name: 'Dos profesionales de salud revisan información en una tablet y una computadora' });
  92  |   await photograph.scrollIntoViewIfNeeded();
  93  |   await expect.poll(() => photograph.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 300), { message: 'The professional photograph must load at the appropriate responsive resolution' }).toBe(true);
  94  |   for (const width of info.project.name === 'chrome-desktop' ? [1440, 390, 320] : [390]) {
  95  |     await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
  96  |     await noOverflow(page);
  97  |     await screenshot(page, info, `landing-${width}`);
  98  |     if (width !== 320) await a11y(page, info, `landing-${width}`);
  99  |   }
  100 |   await expect(page.getByRole('contentinfo').getByRole('link', { name: /consola atlas/i })).toHaveAttribute('href', '/admin/login');
  101 |   await expect(page.getByRole('contentinfo').getByRole('link', { name: /aseguradora demo/i })).toHaveAttribute('href', '/insurer/login');
  102 |   const contactLink = page.locator('a[href="#contacto"]:visible').first();
  103 |   await contactLink.click();
  104 |   await expect(page).toHaveURL(/#contacto$/);
  105 |   await expect(page.locator('#contacto form')).toBeVisible();
  106 |   await page.getByRole('link', { name: 'Acceder', exact: true }).click();
  107 |   await expect(page).toHaveURL(/\/login$/);
  108 |   await expect(page.getByLabel('Correo institucional')).toBeVisible();
  109 | });
  110 | 
  111 | test('public landing keeps a static chart when motion is reduced', async ({ page }) => {
  112 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  113 |   await page.goto('/');
  114 |   const donut = page.locator('figure[data-landing-donut]');
  115 |   await donut.scrollIntoViewIfNeeded();
  116 |   await expect(donut.locator('svg')).toBeVisible();
  117 |   await expect(donut.locator('canvas')).toHaveCount(0);
  118 |   const loops = await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations === Infinity).length);
  119 |   expect(loops, 'Reduced motion removes perpetual decorative animation').toBe(0);
  120 | });
  121 | 
  122 | test('commercial request is persisted and visible to the platform operator', async ({ page }) => {
  123 |   await page.goto('/');
  124 |   const email = `${unique('LEAD').toLowerCase()}@example.com`;
  125 |   await page.getByLabel('Nombre completo').fill('Persona sintética QA');
  126 |   await page.getByLabel('Correo de trabajo').fill(email);
  127 |   await page.getByLabel('Hospital u organización').fill('Hospital sintético QA');
  128 |   await page.getByLabel('¿Qué te gustaría resolver?').fill('Validación de recorrido comercial con datos sintéticos.');
  129 |   await page.getByRole('checkbox').check();
  130 |   await page.locator('#contacto form').getByRole('button', { name: 'Enviar solicitud' }).click();
  131 |   await expect(page.locator('#contacto [role="status"]')).toBeVisible();
  132 |   await login(page, 'atlas@demo.atlaslink.mx');
  133 |   await page.goto('/admin/leads');
  134 |   await page.getByRole('textbox', { name: 'Buscar solicitudes' }).fill(email);
  135 |   await expect(page.getByRole('cell').filter({ hasText: email })).toBeVisible();
  136 |   await page.getByRole('button', { name: 'Ver solicitud' }).click();
  137 |   await expect(page.getByRole('dialog')).toContainText('Validación de recorrido comercial con datos sintéticos.');
  138 | });
  139 | 
  140 | test('both login surfaces autocomplete every embedded demo profile and reject disabled account', async ({ page }, info) => {
  141 |   await page.goto('/login');
  142 |   const profiles = ['admin', 'caja', 'auditor', 'direccion', 'aseguradora', 'baja'];
  143 |   for (const prefix of profiles) {
  144 |     const email = `${prefix}@demo.atlaslink.mx`;
  145 |     await page.getByRole('button').filter({ has: page.getByText(email, { exact: true }) }).click();
  146 |     await expect(page.getByLabel('Correo institucional')).toHaveValue(email);
  147 |     await expect(page.locator('input[name="password"]')).toHaveValue('AtlasDemo2026!');
  148 |   }
```