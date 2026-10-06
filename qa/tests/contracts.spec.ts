import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('admission date selects agreement; frozen evidence remains reproducible after correction', async ({ request }, info) => {
  const run = `qa-contract-${randomUUID().slice(0, 8)}`;
  let bearer: string | undefined;
  async function call(method: string, endpoint: string, data?: unknown, expected = 200, headers: Record<string, string> = {}) {
    const response = await request.fetch(`/api${endpoint}`, { method, data, headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...headers } });
    expect(response.status(), `${method} ${endpoint}: HTTP ${response.status()}`).toBe(expected);
    return response.json();
  }
  const platform = await call('POST', '/auth/login', { email: 'atlas@demo.atlaslink.mx', password: 'AtlasDemo2026!' });
  bearer = platform.token;
  const email = `${run}@example.com`;
  const password = `SyntheticQA-${randomUUID()}`;
  const tenant = await call('POST', '/tenants', { name: `QA Contract ${run}`, slug: run, admin: { name: 'QA Contract Administrator', email, password } }, 201);
  expect(tenant.provisioning.status).toBe('READY');
  const administrator = await call('POST', '/auth/login', { email, password });
  bearer = administrator.token;
  const insurers = await call('GET', '/insurers');
  const insurer = insurers[0];
  const rules = (tariff: number) => ({ tariffs: { 'QA-STAY': tariff }, excludedCodes: [], maxQuantities: { 'QA-STAY': 10 }, highRiskThreshold: 1000 });
  const earlier = await call('POST', '/agreements', { name: 'QA ingreso agosto', insurerId: insurer.id, validFrom: '2026-08-01', validTo: '2026-08-31', rules: rules(100) });
  await call('POST', `/agreements/${earlier.id}/publish`);
  const later = await call('POST', '/agreements', { name: 'QA egreso septiembre', insurerId: insurer.id, validFrom: '2026-09-01', validTo: '2026-09-30', rules: rules(200) });
  await call('POST', `/agreements/${later.id}/publish`);
  const overlap = await call('POST', '/agreements', { name: 'QA inclusive boundary overlap', insurerId: insurer.id, validFrom: '2026-08-31', validTo: '2026-08-31', rules: rules(900) });
  await call('POST', `/agreements/${overlap.id}/publish`, {}, 409);
  const afterRejection = await call('GET', '/agreements');
  expect(afterRejection.find((agreement: any) => agreement.id === overlap.id).status).toBe('DRAFT');
  const account = await call('POST', '/accounts', {
    folio: run.toUpperCase(), patientReference: 'PAC-SINTETICO-CONTRATO', insurerId: insurer.id,
    admissionDate: '2026-08-31', dischargeDate: '2026-09-01', policyNumber: 'POL-SINTETICA', diagnosis: 'Z00.0',
    policy: { deductible: 0, coinsuranceRate: 0, coinsuranceCap: 0, coverageAvailable: 10000 },
    lines: [{ code: 'QA-STAY', description: 'Cargo sintético que cruza vigencias', category: 'ROOM', quantity: 1, unitPrice: 150 }],
  }, 200, { 'Idempotency-Key': randomUUID() });
  await info.attach('agreement-date-contract.json', { body: JSON.stringify({ tenantId: tenant.id, accountId: account.id, admission: account.admissionDate, discharge: account.dischargeDate, expectedAgreementId: earlier.id, observedAgreementId: account.agreementId, expectedAdjustment: 50, observedAdjustment: account.evaluation.tariffAdjustment }, null, 2), contentType: 'application/json' });
  expect(Number(account.evaluation.tariffAdjustment), 'Agreement must be selected by admission date, not discharge date').toBe(50);
  expect(account.agreementId).toBe(earlier.id);
  expect(account.evaluation.agreementVersion).toBe(earlier.version);
  const chain = await call('GET', `/accounts/${account.id}/evaluations`);
  expect(chain).toHaveLength(1);
  expect(chain[0].evidenceAvailable).toBe(true);
  const first = await call('GET', `/accounts/${account.id}/evaluations/${chain[0].id}`);
  expect(first.engineArtifactSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(first.inputSnapshot.admissionDate).toBe('2026-08-31');
  expect(first.rulesSnapshot.resolvedForAdmissionDate).toBe('2026-08-31');
  expect(first.rulesSnapshot.agreementId).toBe(earlier.id);
  expect(Number(first.inputSnapshot.lines[0].unitPrice)).toBe(150);
  expect(Number(first.rulesSnapshot.rules.tariffs['QA-STAY'])).toBe(100);
  expect(Number(first.resultSnapshot.tariffAdjustment)).toBe(50);
  // Independent reconstruction for this single-line, zero-deductible scenario.
  const originalInput = first.inputSnapshot.lines[0];
  const reconstructedAdjustment = Math.max(0, Number(originalInput.unitPrice) - Number(first.rulesSnapshot.rules.tariffs[originalInput.code])) * Number(originalInput.quantity);
  expect(reconstructedAdjustment).toBe(50);
  let current = await call('POST', `/accounts/${account.id}/claim`, { version: account.version });
  current = await call('PATCH', `/accounts/${account.id}/lines/${current.lines[0].id}`, { version: current.version, quantity: 1, unitPrice: 180, justification: 'Corrección sintética QA para verificar la evidencia congelada.' });
  current = await call('POST', `/accounts/${account.id}/evaluate`, { version: current.version });
  expect(Number(current.evaluation.tariffAdjustment)).toBe(80);
  const preserved = await call('GET', `/accounts/${account.id}/evaluations/${chain[0].id}`);
  expect(preserved.inputSnapshot).toEqual(first.inputSnapshot);
  expect(preserved.rulesSnapshot).toEqual(first.rulesSnapshot);
  expect(preserved.resultSnapshot).toEqual(first.resultSnapshot);
  expect(preserved.engineArtifactSha256).toBe(first.engineArtifactSha256);
  const revisedChain = await call('GET', `/accounts/${account.id}/evaluations`);
  expect(revisedChain).toHaveLength(2);
  const latest = revisedChain.find((evaluation: any) => evaluation.id !== chain[0].id);
  expect(latest.previousEvaluationId).toBe(chain[0].id);
  await call('GET', `/accounts/${account.id}/evaluations?limit=0`, undefined, 400);
  await call('GET', `/accounts/${account.id}/evaluations?limit=201`, undefined, 400);
  await call('GET', `/accounts/${account.id}/evaluations?offset=-1`, undefined, 400);
  const historyFirstPage = await call('GET', `/accounts/${account.id}/evaluations?offset=0&limit=1`);
  const historySecondPage = await call('GET', `/accounts/${account.id}/evaluations?offset=1&limit=1`);
  expect(historyFirstPage).toHaveLength(1);
  expect(historySecondPage).toHaveLength(1);
  expect(historyFirstPage[0].id).not.toBe(historySecondPage[0].id);
  expect(new Set([historyFirstPage[0].id, historySecondPage[0].id])).toEqual(new Set(revisedChain.map((evaluation: any) => evaluation.id)));
  const historyEnd = await call('GET', `/accounts/${account.id}/evaluations?offset=2&limit=1`);
  expect(historyEnd).toEqual([]);
  await info.attach('evaluation-pagination-contract.json', { body: JSON.stringify({ accountId: account.id, invalidLimits: [0, 201], invalidOffset: -1, expectedInvalidStatus: 400, firstEvaluationId: historyFirstPage[0].id, secondEvaluationId: historySecondPage[0].id, endOfHistory: historyEnd }, null, 2), contentType: 'application/json' });
  // Re-run the actual engine by ingesting the frozen inputs as a separate synthetic
  // account in the same isolated tenant, whose published agreements are immutable.
  const replay = await call('POST', '/accounts', {
    folio: `${run.toUpperCase()}-REPLAY`, patientReference: 'PAC-SINTETICO-REPLAY', insurerId: insurer.id,
    admissionDate: first.inputSnapshot.admissionDate, dischargeDate: first.inputSnapshot.dischargeDate,
    policyNumber: 'POL-SINTETICA', diagnosis: 'Z00.0', policy: first.inputSnapshot.policy,
    lines: first.inputSnapshot.lines.filter((line: any) => !line.removed).map((line: any) => ({ code: line.code, description: line.description, category: line.category, quantity: line.quantity, unitPrice: line.unitPrice })),
  }, 200, { 'Idempotency-Key': randomUUID() });
  const replayChain = await call('GET', `/accounts/${replay.id}/evaluations`);
  const replayEvidence = await call('GET', `/accounts/${replay.id}/evaluations/${replayChain[0].id}`);
  expect(replayEvidence.engineArtifactSha256).toBe(first.engineArtifactSha256);
  expect(replay.agreementId).toBe(earlier.id);
  for (const field of ['billedTotal', 'excludedTotal', 'tariffAdjustment', 'deductible', 'coinsurance', 'insurerEstimate', 'patientEstimate', 'unresolvedAmount']) {
    expect(Number(replay.evaluation[field]), `Frozen-input replay ${field}`).toBe(Number(first.resultSnapshot[field]));
  }
  await info.attach('frozen-evidence-replay.json', { body: JSON.stringify({ accountId: account.id, originalEvaluationId: chain[0].id, revisedEvaluationId: latest.id, replayAccountId: replay.id, engineArtifactSha256: first.engineArtifactSha256, originalAdjustment: 50, currentAdjustment: 80, reconstructedAdjustment, replayAdjustment: replay.evaluation.tariffAdjustment, persistedSnapshotsUnchanged: true }, null, 2), contentType: 'application/json' });
  const anotherHospital = await call('POST', '/auth/login', { email: 'admin@demo.atlaslink.mx', password: 'AtlasDemo2026!' });
  bearer = anotherHospital.token;
  await call('GET', `/accounts/${account.id}/evaluations`, undefined, 404);
  await call('GET', `/accounts/${account.id}/evaluations/${chain[0].id}`, undefined, 404);
  bearer = platform.token;
  await call('GET', `/accounts/${account.id}/evaluations`, undefined, 403);
  bearer = undefined;
  await call('GET', `/accounts/${account.id}/evaluations`, undefined, 401);
  await info.attach('evaluation-access-contract.json', { body: JSON.stringify({ otherHospital: { historyStatus: 404, snapshotStatus: 404 }, platform: { historyStatus: 403 }, anonymous: { historyStatus: 401 } }, null, 2), contentType: 'application/json' });
});
