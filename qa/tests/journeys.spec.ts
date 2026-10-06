import { test as base, expect, chromium, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const test = base.extend<{ diagnostics: void }>({
  browser: [async ({}, use) => {
    const sharedEndpoint = process.env.ATLAS_CDP_URL;
    const browser = sharedEndpoint
      ? await chromium.connectOverCDP(sharedEndpoint)
      : await chromium.launch({ channel: 'chrome', headless: true });
    await use(browser);
    // Preserve a browser shared through CDP; test contexts are closed by Playwright.
    if (!sharedEndpoint) await browser.close();
  }, { scope: 'worker' }],
  diagnostics: [async ({ page }, use, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const serverErrors: { url: string; status: number }[] = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 1200)); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => { if (response.status() >= 500 && ['127.0.0.1', 'localhost'].includes(new URL(response.url()).hostname)) serverErrors.push({ url: new URL(response.url()).pathname, status: response.status() }); });
    await use();
    await testInfo.attach('browser-diagnostics.json', { body: JSON.stringify({ browser: 'installed Google Chrome / Chromium engine', platform: process.platform, emulation: testInfo.project.name, consoleErrors, pageErrors, serverErrors }, null, 2), contentType: 'application/json' });
    expect(pageErrors, 'No uncaught browser exceptions').toEqual([]);
    expect(serverErrors, 'No local server 5xx during browser journey').toEqual([]);
  }, { auto: true }],
});

const unique = (prefix: string) => `QA-UI-${prefix}-${randomUUID().slice(0, 8)}`;
async function ready(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
}
async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true, animations: 'disabled', caret: 'initial' });
  await info.attach(name, { path: info.outputPath(`${name}.png`), contentType: 'image/png' });
}
async function noOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(metrics.scrollWidth, 'Document must fit the viewport; tables may scroll internally').toBeLessThanOrEqual(metrics.width + 1);
}
async function revealLanding(page: Page) {
  const sections = page.locator('main [data-reveal]');
  for (let index = 0; index < await sections.count(); index++) {
    const section = sections.nth(index);
    await section.scrollIntoViewIfNeeded();
    await expect(section, `Landing section ${index + 1} becomes visible after scrolling`).toHaveAttribute('data-reveal-state', 'visible');
  }
  await page.evaluate(() => scrollTo(0, 0));
}
async function a11y(page: Page, info: TestInfo, name: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  await info.attach(`${name}-axe.json`, { body: JSON.stringify({ url: new URL(page.url()).pathname, violations: results.violations, incomplete: results.incomplete, passes: results.passes.map(p => p.id) }, null, 2), contentType: 'application/json' });
  expect.soft(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, examples: v.nodes.slice(0, 5).map(n => n.target) })), 'Axe serious/critical accessibility findings').toEqual([]);
}
async function login(page: Page, email = 'admin@demo.atlaslink.mx', password = 'AtlasDemo2026!') {
  const platform = email === 'atlas@demo.atlaslink.mx';
  await page.goto(platform ? '/admin/login' : '/login');
  const card = page.getByRole('button').filter({ has: page.getByText(email, { exact: true }) });
  if (email.endsWith('@demo.atlaslink.mx') && email !== 'otro@demo.atlaslink.mx') {
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByLabel('Correo institucional')).toHaveValue(email);
    await expect(page.locator('input[name="password"]')).toHaveValue(password);
  } else {
    await page.getByLabel('Correo institucional').fill(email);
    await page.locator('input[name="password"]').fill(password);
  }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(platform ? /\/admin$/ : /\/hospital$/);
  await expect(page.locator('[data-system-cover]')).toBeVisible();
}
async function token(page: Page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('atlas.session') || '{}').token as string);
}
async function api(page: Page, endpoint: string) {
  const response = await page.request.get(`/api${endpoint}`, { headers: { Authorization: `Bearer ${await token(page)}` } });
  expect(response.ok(), `GET ${endpoint}: ${response.status()}`).toBeTruthy();
  return response.json();
}
async function openMenuIfMobile(page: Page) {
  const menu = page.getByRole('button', { name: 'Abrir menú', exact: true });
  if (await menu.isVisible()) await menu.click();
}

test('public landing presents a labeled demo, real photography and responsive routes', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Claridad antes\s*de cada envío\./);
  const donut = page.locator('figure[data-landing-donut]');
  await expect(donut).toHaveAttribute('aria-label', 'Distribución ilustrativa de cuentas');
  await expect(donut.getByText('Datos sintéticos de demostración.')).toBeVisible();
  await expect(donut.locator('svg')).toHaveCount(1);
  for (const [label, percentage] of [['Preparadas', '60 %'], ['En revisión', '25 %'], ['Por resolver', '15 %']]) {
    await expect(donut.getByText(label, { exact: true })).toBeVisible();
    await expect(donut.getByText(percentage, { exact: true })).toBeVisible();
  }
  const photograph = page.getByRole('img', { name: 'Dos profesionales de salud revisan información en una tablet y una computadora' });
  await photograph.scrollIntoViewIfNeeded();
  await expect.poll(() => photograph.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 300), { message: 'The professional photograph must load at the appropriate responsive resolution' }).toBe(true);
  for (const width of info.project.name === 'chrome-desktop' ? [1440, 390, 320] : [390]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await revealLanding(page);
    await noOverflow(page);
    await screenshot(page, info, `landing-${width}`);
    if (width !== 320) await a11y(page, info, `landing-${width}`);
  }
  await expect(page.getByRole('contentinfo').getByRole('link', { name: /consola atlas/i })).toHaveAttribute('href', '/admin/login');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: /aseguradora demo/i })).toHaveAttribute('href', '/insurer/login');
  const contactLink = page.locator('a[href="#contacto"]:visible').first();
  await contactLink.click();
  await expect(page).toHaveURL(/#contacto$/);
  await expect(page.locator('#contacto form')).toBeVisible();
  await page.getByRole('link', { name: 'Acceder', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Correo institucional')).toBeVisible();
});

test('public landing keeps a static chart when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const donut = page.locator('figure[data-landing-donut]');
  await donut.scrollIntoViewIfNeeded();
  await expect(donut.locator('svg')).toBeVisible();
  await expect(donut.locator('canvas')).toHaveCount(0);
  const loops = await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations === Infinity).length);
  expect(loops, 'Reduced motion removes perpetual decorative animation').toBe(0);
});

test('commercial request is persisted and visible to the platform operator', async ({ page }) => {
  await page.goto('/');
  const email = `${unique('LEAD').toLowerCase()}@example.com`;
  await page.getByLabel('Nombre completo').fill('Persona sintética QA');
  await page.getByLabel('Correo de trabajo').fill(email);
  await page.getByLabel('Hospital u organización').fill('Hospital sintético QA');
  await page.getByLabel('¿Qué te gustaría resolver?').fill('Validación de recorrido comercial con datos sintéticos.');
  await page.getByRole('checkbox').check();
  await page.locator('#contacto form').getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.locator('#contacto [role="status"]')).toBeVisible();
  await login(page, 'atlas@demo.atlaslink.mx');
  await page.goto('/admin/leads');
  await page.getByRole('textbox', { name: 'Buscar solicitudes' }).fill(email);
  await expect(page.getByRole('cell').filter({ hasText: email })).toBeVisible();
  await page.getByRole('button', { name: 'Ver solicitud' }).click();
  await expect(page.getByRole('dialog')).toContainText('Validación de recorrido comercial con datos sintéticos.');
});

test('both login surfaces autocomplete every embedded demo profile and reject disabled account', async ({ page }, info) => {
  await page.goto('/login');
  const profiles = ['admin', 'caja', 'auditor', 'direccion', 'aseguradora', 'baja'];
  for (const prefix of profiles) {
    const email = `${prefix}@demo.atlaslink.mx`;
    await page.getByRole('button').filter({ has: page.getByText(email, { exact: true }) }).click();
    await expect(page.getByLabel('Correo institucional')).toHaveValue(email);
    await expect(page.locator('input[name="password"]')).toHaveValue('AtlasDemo2026!');
  }
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('[data-login-form]').getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await noOverflow(page);
  await screenshot(page, info, 'hospital-login');
  await a11y(page, info, 'hospital-login');
  await page.goto('/admin/login');
  await page.getByTestId('demo-platform_admin').click();
  await expect(page.getByLabel('Correo institucional')).toHaveValue('atlas@demo.atlaslink.mx');
  await expect(page.locator('input[name="password"]')).toHaveValue('AtlasDemo2026!');
  await noOverflow(page);
  await screenshot(page, info, 'platform-login');
  await a11y(page, info, 'platform-login');
});

for (const profile of [
  { email: 'admin', visible: ['Bandeja de revisión', 'Cargar cuentas', 'Convenios', 'Reportes', 'Equipo y accesos'], hidden: [] },
  { email: 'caja', visible: ['Cargar cuentas'], hidden: ['Bandeja de revisión', 'Convenios', 'Equipo y accesos', 'Reportes'] },
  { email: 'auditor', visible: ['Bandeja de revisión', 'Cargar cuentas'], hidden: ['Convenios', 'Equipo y accesos'] },
  { email: 'direccion', visible: ['Reportes'], hidden: ['Cargar cuentas', 'Bandeja de revisión', 'Equipo y accesos'] },
  { email: 'aseguradora', visible: ['Cuentas hospitalarias'], hidden: ['Cargar cuentas', 'Bandeja de revisión', 'Convenios', 'Equipo y accesos'] },
]) {
  test(`hospital role ${profile.email}: real authentication, dashboard and navigation permissions`, async ({ page }, info) => {
    await login(page, `${profile.email}@demo.atlaslink.mx`);
    await noOverflow(page);
    await screenshot(page, info, `dashboard-${profile.email}`);
    if (profile.email === 'admin') await a11y(page, info, 'hospital-dashboard');
    await openMenuIfMobile(page);
    const nav = page.getByRole('navigation', { name: 'Navegación del espacio' });
    for (const label of profile.visible) await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    for (const label of profile.hidden) await expect(nav.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Cuentas hospitalarias', exact: true }).click();
    await expect(page).toHaveURL(/\/hospital\/accounts$/);
    await expect(page.getByRole('region', { name: 'Tabla de cuentas hospitalarias', exact: true }).getByRole('table')).toBeVisible();
    await noOverflow(page);
  });
}

test('manual intake, correction, reevaluation, real export and recorded insurer outcome', async ({ page }, info) => {
  await login(page);
  const agreements = await api(page, '/agreements');
  const agreement = agreements.find((a: any) => a.status === 'PUBLISHED' && Object.keys(a.rules.tariffs).length);
  const [code, tariff] = Object.entries(agreement.rules.tariffs)[0] as [string, number];
  const folio = unique('REVIEW');
  await page.goto('/hospital/import');
  await page.getByRole('tab', { name: 'Capturar cuenta' }).click();
  await page.getByLabel('Folio de la cuenta').fill(folio);
  await page.getByLabel('Referencia del paciente').fill('PAC-SINTETICO-QA');
  await page.getByLabel('Aseguradora', { exact: false }).selectOption(agreement.insurerId);
  await page.getByLabel('Número de póliza').fill('POL-SINTETICA-QA');
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' }).format(new Date());
  await page.getByLabel('Fecha de ingreso').fill(date);
  await page.getByLabel('Fecha de egreso').fill(date);
  await page.getByLabel('Diagnóstico principal CIE-10').fill('Z00.0');
  await page.getByLabel('Código', { exact: false }).fill(code);
  await page.getByLabel('Descripción', { exact: false }).fill('Cargo sintético de prueba QA');
  await page.getByLabel('Precio unitario · MXN').fill(String(Number(tariff) * 2));
  await page.getByRole('button', { name: 'Crear y evaluar cuenta' }).click();
  await expect(page.getByRole('heading', { level: 1, name: folio })).toBeVisible();
  const accountId = page.url().split('/').pop();
  await page.getByRole('button', { name: 'Tomar revisión' }).click();
  await expect(page.getByRole('button', { name: 'Revisión asignada a ti' })).toBeVisible();
  await page.getByRole('button', { name: 'Corregir Cargo sintético de prueba QA' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Precio unitario · MXN').fill(String(tariff));
  await dialog.getByLabel('Justificación del cambio').fill('Ajuste sintético QA para cumplir el tabulador de demostración.');
  await dialog.getByRole('button', { name: 'Guardar corrección' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Hay correcciones posteriores a la última evaluación.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Reevaluar', exact: true }).click();
  await expect(page.getByText('Hay correcciones posteriores a la última evaluación.', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Preparar para envío' }).click();
  const reason = page.getByRole('dialog').getByLabel('Motivo para continuar con hallazgos');
  if (await reason.isVisible()) { await reason.fill('Aceptación sintética QA de los hallazgos.'); await page.getByRole('dialog').getByRole('checkbox').check(); }
  await page.getByRole('dialog').getByRole('button', { name: 'Preparar cuenta' }).click();
  await expect(page.getByRole('button', { name: 'Exportar Excel' })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Excel' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`${folio}.xlsx`);
  const file = info.outputPath(`${folio}.xlsx`);
  await download.saveAs(file);
  expect((await readFile(file)).subarray(0, 2).toString()).toBe('PK');
  const pdfEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF' }).click();
  const pdf = await pdfEvent;
  expect(pdf.suggestedFilename()).toBe(`${folio}.pdf`);
  const pdfPath = info.outputPath(`${folio}.pdf`);
  await pdf.saveAs(pdfPath);
  const pdfBytes = await readFile(pdfPath);
  expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdfBytes.toString('latin1')).toContain('%%EOF');
  await page.getByRole('button', { name: 'Registrar envío manual' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar envío registrado' }).click();
  await page.getByRole('button', { name: 'Registrar respuesta' }).click();
  await page.getByRole('dialog').getByLabel('Monto autorizado · MXN').fill('0');
  await page.getByRole('dialog').getByLabel('Motivo o referencia de respuesta').fill('Resultado sintético QA, sin transmisión externa.');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar respuesta' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await api(page, `/accounts/${accountId}`)).status).toBe('RESOLVED');
  await page.reload();
  await expect(page.getByRole('heading', { name: folio, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /^Historial/ }).click();
  await expect(page.getByText('Ajuste sintético QA para cumplir el tabulador de demostración.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Evaluaciones', exact: true }).click();
  const evaluations = await api(page, `/accounts/${accountId}/evaluations`);
  expect(evaluations.length).toBeGreaterThanOrEqual(2);
  const original = evaluations.find((evaluation: any) => !evaluation.previousEvaluationId);
  await expect(page.getByLabel('Evaluación a consultar')).toBeVisible();
  const selectedEvidence = page.waitForResponse(response => response.url().endsWith(`/evaluations/${original.id}`) && response.request().method() === 'GET');
  await page.getByLabel('Evaluación a consultar').selectOption(original.id);
  await selectedEvidence;
  const evidenceDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar evidencia JSON' }).click();
  const evidenceFile = info.outputPath('historical-evaluation.json');
  await (await evidenceDownload).saveAs(evidenceFile);
  const frozen = JSON.parse(await readFile(evidenceFile, 'utf8'));
  expect(frozen.id).toBe(original.id);
  expect(frozen.evidenceAvailable).toBe(true);
  expect(Number(frozen.inputSnapshot.lines[0].unitPrice)).toBe(Number(tariff) * 2);
  expect(frozen.engineArtifactSha256).toMatch(/^[a-f0-9]{64}$/);
  await noOverflow(page);
  await screenshot(page, info, 'account-resolved');
  await a11y(page, info, 'account-detail');
});

test('download template and import Excel through the browser persists a unique account', async ({ page }, info) => {
  await login(page, 'caja@demo.atlaslink.mx');
  await page.goto('/hospital/import');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Plantilla', exact: true }).click();
  const source = info.outputPath('downloaded-template.xlsx');
  await (await downloadEvent).saveAs(source);
  const upload = info.outputPath('synthetic-upload.xlsx');
  const folio = unique('XLSX');
  execFileSync('python3', [path.resolve('helpers/rewrite-template.py'), source, upload, folio]);
  await page.getByLabel('Seleccionar archivo Excel').setInputFiles(upload);
  await page.getByRole('button', { name: 'Importar y evaluar' }).click();
  await expect(page.getByRole('heading', { name: folio, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: folio, exact: true })).toBeVisible();
  const saved = await api(page, `/accounts/${page.url().split('/').pop()}`);
  expect(saved.folio).toBe(folio);
  expect(saved.lines).toHaveLength(1);
  await screenshot(page, info, 'excel-imported');
});

test('platform onboarding, persisted license capacity and new hospital login', async ({ page }, info) => {
  await login(page, 'atlas@demo.atlaslink.mx');
  await noOverflow(page);
  await screenshot(page, info, 'platform-dashboard');
  await a11y(page, info, 'platform-dashboard');
  await page.goto('/admin/tenants');
  const name = unique('HOSPITAL');
  const email = `${name.toLowerCase()}@example.com`;
  const password = `SyntheticQA-${randomUUID()}`;
  await page.getByRole('button', { name: 'Registrar hospital', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre del hospital').fill(name);
  await dialog.getByLabel('Identificador del espacio').fill(name.toLowerCase());
  await dialog.getByLabel('Nombre del administrador').fill('Administrador Sintético QA');
  await dialog.getByLabel('Correo del administrador').fill(email);
  await dialog.getByLabel('Contraseña inicial').fill(password);
  await dialog.getByRole('button', { name: 'Registrar hospital', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.goto('/admin/licenses');
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Configurar' }).click();
  await page.getByRole('dialog').getByLabel('Nombre del plan').fill('QA plan sintético');
  await page.getByRole('dialog').getByLabel('Cuentas por mes').fill('25');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar licencia' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: name })).toContainText('QA plan sintético');
  expect((await api(page, '/licenses')).find((l: any) => l.tenantName === name).monthlyAccountLimit).toBe(25);
  await noOverflow(page);
  await screenshot(page, info, 'licenses');
  await a11y(page, info, 'licenses');
  await login(page, email, password);
  await expect(page.getByRole('heading', { name: 'Hola, Administrador.' })).toBeVisible();
  expect(await api(page, '/accounts')).toEqual([]);
  // Newly onboarded hospitals can legitimately receive a charge before publishing
  // an agreement; the historical evidence screen must handle rules:null.
  const insurers = await api(page, '/insurers');
  const noAgreement = await page.request.post('/api/accounts', { headers: { Authorization: `Bearer ${await token(page)}`, 'Idempotency-Key': randomUUID() }, data: {
    folio: unique('NO-AGREEMENT'), patientReference: 'PAC-SINTETICO-QA', insurerId: insurers[0].id,
    admissionDate: '2026-09-01', dischargeDate: '2026-09-01', policyNumber: 'POL-SINTETICA', diagnosis: 'Z00.0',
    policy: { deductible: 0, coinsuranceRate: 0, coinsuranceCap: 0, coverageAvailable: 10000 },
    lines: [{ code: 'QA-NO-AGREEMENT', description: 'Cargo sin convenio sintético', category: 'OTHER', quantity: 1, unitPrice: 100 }],
  } });
  expect(noAgreement.ok()).toBeTruthy();
  const account = await noAgreement.json();
  await page.goto(`/hospital/accounts/${account.id}`);
  await page.getByRole('tab', { name: 'Evaluaciones', exact: true }).click();
  await expect(page.getByText('Sin convenio aplicable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar evidencia JSON' })).toBeEnabled();
  await noOverflow(page);
});

test('read-only role route gate and revoked session redirect', async ({ page }, info) => {
  await login(page, 'direccion@demo.atlaslink.mx');
  await page.goto('/hospital/import');
  await expect(page.getByRole('heading', { name: 'Esta función corresponde a otro perfil' })).toBeVisible();
  const bearer = await token(page);
  const response = await page.request.post('/api/auth/logout', { headers: { Authorization: `Bearer ${bearer}` }, data: {} });
  expect(response.status()).toBe(204);
  await page.goto('/hospital');
  await expect(page).toHaveURL(/\/login$/);
  await screenshot(page, info, 'revoked-session');
});


test('agreement Excel preview rejects invalid rows, then imports and publishes an isolated draft', async ({ page }, info) => {
  await login(page, 'atlas@demo.atlaslink.mx');
  const run = unique('TABULATOR');
  const email = `${run.toLowerCase()}@example.com`;
  const password = `SyntheticQA-${randomUUID()}`;
  const created = await page.request.post('/api/tenants', { headers: { Authorization: `Bearer ${await token(page)}` }, data: { name: run, slug: run.toLowerCase(), admin: { name: 'QA Convenios', email, password } } });
  expect(created.status()).toBe(201);
  expect((await created.json()).provisioning.status).toBe('READY');
  await login(page, email, password);
  expect(await api(page, '/agreements')).toEqual([]);
  await page.goto('/hospital/agreements');
  await page.getByRole('button', { name: 'Importar tabulador', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const templateEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Plantilla de tabulador' }).click();
  const source = info.outputPath('agreement-template.xlsx');
  await (await templateEvent).saveAs(source);
  const invalid = info.outputPath('agreement-invalid-code.xlsx');
  execFileSync('python3', [path.resolve('helpers/rewrite-template.py'), source, invalid, 'INVALID CODE ???']);
  await dialog.getByLabel('Seleccionar tabulador Excel').setInputFiles(invalid);
  await dialog.getByRole('button', { name: 'Revisar archivo' }).click();
  await expect(dialog.getByRole('heading', { name: 'Encontramos campos por corregir' })).toBeVisible();
  await expect(dialog.getByRole('table')).toContainText('2');
  await expect(dialog.getByText('No se ha creado ningún convenio.', { exact: false })).toBeVisible();
  expect(await api(page, '/agreements')).toEqual([]);
  await dialog.getByLabel('Seleccionar tabulador Excel').setInputFiles(source);
  await dialog.getByRole('button', { name: 'Revisar archivo' }).click();
  await expect(dialog.getByText('filas validadas.', { exact: false })).toBeVisible();
  const insurers = await api(page, '/insurers');
  await dialog.getByLabel('Nombre del convenio').fill(run);
  await dialog.getByLabel('Aseguradora', { exact: false }).selectOption(insurers[0].id);
  await dialog.getByLabel('Vigente desde').fill('2026-01-01');
  await dialog.getByLabel('Vigente hasta').fill('2026-12-31');
  await screenshot(page, info, 'agreement-preview');
  await a11y(page, info, 'agreement-preview');
  await dialog.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(dialog).not.toBeVisible();
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: run, exact: true }) });
  await expect(card).toContainText('Borrador');
  const draft = (await api(page, '/agreements')).find((agreement: any) => agreement.name === run);
  expect(draft.status).toBe('DRAFT');
  await card.getByRole('button', { name: 'Publicar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publicar convenio', exact: true }).click();
  await expect(card).toContainText('Publicado');
  await page.reload();
  expect((await api(page, '/agreements')).find((agreement: any) => agreement.id === draft.id).status).toBe('PUBLISHED');
  await expect(page.getByRole('heading', { name: run, exact: true })).toBeVisible();
  await noOverflow(page);
  await screenshot(page, info, 'agreement-published');
  await a11y(page, info, 'agreements');
});
