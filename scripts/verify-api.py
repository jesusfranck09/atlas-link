#!/usr/bin/env python3
"""Real HTTP integration against local Atlas services and PostgreSQL, synthetic data only."""
import concurrent.futures
import copy
import datetime
import io
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
import uuid
import zipfile
import xml.etree.ElementTree as ET
from decimal import Decimal
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('ATLAS_API_URL', 'http://127.0.0.1:8095/api')
RUN = 'QA-' + uuid.uuid4().hex[:10].upper()
checks = []
requests = []
artifacts = []
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)


def request(path, method='GET', body=None, token=None, expected=200, headers=None, raw=False):
    h = {'Accept': 'application/json', **(headers or {})}
    if token:
        h['Authorization'] = 'Bearer ' + token
    data = body if isinstance(body, bytes) else None
    if body is not None and not isinstance(body, bytes):
        data = json.dumps(body).encode()
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=25)
    except urllib.error.HTTPError as error:
        response = error
    content = response.read()
    requests.append({'method': method, 'path': path, 'status': response.status})
    allowed = [expected] if isinstance(expected, int) else expected
    assert response.status in allowed, f'{method} {path}: expected {allowed}, received {response.status}: {content[:600]!r}'
    if raw:
        return content
    return json.loads(content) if content else None


def check(name, **observed):
    checks.append({'name': name, 'status': 'pass', **observed})
    print('PASS ' + name, flush=True)


def login(email, password='AtlasDemo2026!'):
    return request('/auth/login', 'POST', {'email': email, 'password': password})['token']


def create_account(payload, token, key=None):
    return request('/accounts', 'POST', payload, token, expected=200,
                   headers={'Idempotency-Key': key or str(uuid.uuid4())})


def upload_template(template, folio, token, formula=False):
    """Alter a server-generated XLSX without installing an extra Excel library."""
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(template)) as source, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as dest:
        for item in source.infolist():
            content = source.read(item.filename)
            if item.filename == 'xl/worksheets/sheet1.xml':
                sheet = ET.fromstring(content)
                cell = sheet.find('.//s:c[@r="A2"]', ns)
                assert cell is not None
                cell.clear()
                cell.set('r', 'A2')
                cell.set('t', 'inlineStr')
                ET.SubElement(ET.SubElement(cell, '{'+ns['s']+'}is'), '{'+ns['s']+'}t').text = folio
                if formula:
                    target = sheet.find('.//s:c[@r="K2"]', ns)
                    target.clear()
                    target.set('r', 'K2')
                    ET.SubElement(target, '{'+ns['s']+'}f').text = '1+1'
                    ET.SubElement(target, '{'+ns['s']+'}v').text = '2'
                content = ET.tostring(sheet, encoding='utf-8', xml_declaration=True)
            dest.writestr(item, content)
    boundary = 'atlasqa' + uuid.uuid4().hex
    data = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic-qa.xlsx"\r\n'
            'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n').encode() + out.getvalue() + f'\r\n--{boundary}--\r\n'.encode()
    return request('/accounts/import', 'POST', data, token, expected=400 if formula else 200,
                   headers={'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Idempotency-Key': str(uuid.uuid4())})


def main():
    profiles = request('/auth/demo-profiles')
    assert len(profiles) >= 7
    assert any(p['email'] == 'baja@demo.atlaslink.mx' for p in profiles)
    check('demo profiles available including disabled synthetic user')
    request('/accounts', expected=401)
    request('/auth/login', 'POST', {'email': 'caja@demo.atlaslink.mx', 'password': 'incorrect'}, expected=401)
    request('/auth/login', 'POST', {'email': 'baja@demo.atlaslink.mx', 'password': 'AtlasDemo2026!'}, expected=401)
    check('anonymous, incorrect password and disabled user rejected')
    admin = login('admin@demo.atlaslink.mx')
    billing = login('caja@demo.atlaslink.mx')
    reviewer = login('auditor@demo.atlaslink.mx')
    director = login('direccion@demo.atlaslink.mx')
    platform = login('atlas@demo.atlaslink.mx')
    insurer_demo = login('aseguradora@demo.atlaslink.mx')
    other = login('otro@demo.atlaslink.mx')
    check('all active demo roles and secondary hospital authenticate')
    for token in (admin, billing, reviewer, director, insurer_demo):
        assert 'totalAccounts' in request('/dashboard', token=token)
    platform_dashboard = request('/dashboard', token=platform)
    assert 'activeTenants' in platform_dashboard
    request('/accounts', token=platform, expected=403)
    request('/licenses', token=billing, expected=403)
    request('/users', token=director, expected=403)
    check('role and platform boundaries enforced server-side')
    primary = request('/accounts', token=admin)
    secondary = request('/accounts', token=other)
    assert secondary and primary
    assert not {a['id'] for a in primary} & {a['id'] for a in secondary}
    request('/accounts/' + secondary[0]['id'], token=admin, expected=404)
    request('/accounts/' + primary[0]['id'], token=other, expected=404)
    request('/accounts/' + primary[0]['id'] + '/claim', 'POST', {'version': primary[0]['version']}, other, expected=404)
    check('known account UUID cannot cross hospital boundary', primaryCount=len(primary), secondaryCount=len(secondary))
    agreements = request('/agreements', token=admin)
    agreement = next(a for a in agreements if a['status'] == 'PUBLISHED' and a['rules'].get('tariffs'))
    code, price = next(iter(agreement['rules']['tariffs'].items()))
    today = datetime.datetime.now(ZoneInfo('America/Mexico_City')).date().isoformat()
    payload = {'folio': RUN, 'patientReference': 'SYNTHETIC-QA', 'insurerId': agreement['insurerId'],
               'admissionDate': today, 'dischargeDate': today, 'policyNumber': 'DEMO-QA', 'diagnosis': 'Z00.0',
               'policy': {'deductible': 0, 'coinsuranceRate': 0.1, 'coinsuranceCap': 500, 'coverageAvailable': 100000},
               'lines': [{'code': code, 'description': 'Synthetic QA charge', 'category': 'LAB', 'quantity': 1, 'unitPrice': float(price) * 2}]}
    for role in (director, insurer_demo):
        request('/accounts', 'POST', payload, role, expected=403, headers={'Idempotency-Key': str(uuid.uuid4())})
    request('/accounts', 'POST', payload, billing, expected=400)
    invalid = copy.deepcopy(payload)
    invalid['lines'][0]['quantity'] = 0
    request('/accounts', 'POST', invalid, billing, expected=400, headers={'Idempotency-Key': str(uuid.uuid4())})
    check('read-only roles and invalid ingestion blocked')
    key = str(uuid.uuid4())
    account = create_account(payload, billing, key)
    account_id = account['id']
    artifacts.append({'type': 'account', 'id': account_id, 'folio': RUN})
    again = create_account(payload, billing, key)
    assert again['id'] == account_id
    changed = copy.deepcopy(payload)
    changed['patientReference'] = 'DIFFERENT-SYNTHETIC'
    request('/accounts', 'POST', changed, billing, expected=409, headers={'Idempotency-Key': key})
    check('ingestion evaluates; idempotency returns one account and rejects changed payload')
    detail = request('/accounts/' + account_id, token=admin)
    ev = detail['evaluation']
    assert Decimal(str(ev['billedTotal'])) == sum(Decimal(str(ev[k])) for k in ('tariffAdjustment', 'insurerEstimate', 'patientEstimate', 'unresolvedAmount'))
    assert Decimal(str(ev['tariffAdjustment'])) == Decimal(str(price))
    assert any(f['code'] == 'ABOVE_TARIFF' for f in ev['findings'])
    check('financial estimate reconciles exactly and excess tariff is explained')
    request(f'/accounts/{account_id}/ready', 'POST', {'version': detail['version']}, reviewer, expected=409)
    request(f'/accounts/{account_id}/export?format=xlsx', token=billing, expected=409)
    check('risk acceptance and prepared state required before delivery')
    detail = request(f'/accounts/{account_id}/claim', 'POST', {'version': detail['version']}, reviewer)
    stale_version = detail['version']
    line = detail['lines'][0]
    path = f'/accounts/{account_id}/lines/{line["id"]}'
    correction = {'version': stale_version, 'quantity': 1, 'unitPrice': float(price), 'justification': 'Synthetic QA correction to demo tariff'}
    request(path, 'PATCH', {**correction, 'justification': ''}, reviewer, expected=400)
    detail = request(path, 'PATCH', correction, reviewer)
    request(path, 'PATCH', correction, reviewer, expected=409)
    request(f'/accounts/{account_id}/ready', 'POST', {'version': detail['version'], 'acceptRisk': True, 'reason': 'QA synthetic'}, reviewer, expected=409)
    check('review correction requires justification, current version and reevaluation')
    detail = request(f'/accounts/{account_id}/evaluate', 'POST', {'version': detail['version']}, reviewer)
    detail = request(f'/accounts/{account_id}/ready', 'POST', {'version': detail['version'], 'acceptRisk': True, 'reason': 'Synthetic QA acceptance'}, reviewer)
    exported = request(f'/accounts/{account_id}/export?format=csv', token=billing, raw=True)
    assert RUN.encode() in exported
    excel = request(f'/accounts/{account_id}/export?format=xlsx', token=billing, raw=True)
    with zipfile.ZipFile(io.BytesIO(excel)) as workbook:
        assert 'xl/workbook.xml' in workbook.namelist()
    detail = request(f'/accounts/{account_id}/send', 'POST', {'version': detail['version']}, billing)
    detail = request(f'/accounts/{account_id}/outcome', 'POST', {'version': detail['version'], 'result': 'APPROVED', 'authorizedAmount': detail['evaluation']['insurerEstimate'], 'reason': 'Synthetic response'}, billing)
    assert detail['status'] == 'RESOLVED' and len(detail['history']) >= 4
    assert request('/accounts/' + account_id, token=director)['status'] == 'RESOLVED'
    check('full review/export/manual dispatch/outcome persisted and reread by separate user')
    concurrent_payload = {**payload, 'folio': RUN + '-RACE'}
    race_key = str(uuid.uuid4())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: create_account(concurrent_payload, billing, race_key), range(2)))
    assert outcomes[0]['id'] == outcomes[1]['id']
    race_account = outcomes[0]
    def claim(token):
        result = request(f'/accounts/{race_account["id"]}/claim', 'POST', {'version': race_account['version']}, token, expected=[200, 409])
        return 'id' in result
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        winners = list(pool.map(claim, (reviewer, admin)))
    assert sorted(winners) == [False, True]
    check('simultaneous identical ingestion returns one account; competing review has one winner')
    template = request('/accounts/template', token=billing, raw=True)
    imported = upload_template(template, RUN + '-XLSX', billing)
    assert imported['folio'] == RUN + '-XLSX' and len(imported['lines']) == 1
    assert request('/accounts/' + imported['id'], token=admin)['folio'] == imported['folio']
    upload_template(template, RUN + '-FORMULA', billing, formula=True)
    check('real Excel template imports and persists; formulas rejected')
    lead_email = RUN.lower() + '@example.com'
    lead = {'name': 'QA synthetic', 'email': lead_email, 'organization': 'Synthetic hospital', 'message': 'Automated integration test', 'consent': True}
    request('/leads', 'POST', {**lead, 'consent': False}, expected=400)
    request('/leads', 'POST', lead, expected=201)
    assert any(l['email'] == lead_email for l in request('/leads', token=platform))
    check('commercial consent required; lead persists and appears in console')
    password = 'SyntheticQA-' + uuid.uuid4().hex
    email = RUN.lower() + '-admin@example.com'
    tenant = request('/tenants', 'POST', {'name': RUN + ' Synthetic hospital', 'slug': RUN.lower(), 'admin': {'name': 'QA Synthetic Administrator', 'email': email, 'password': password}}, platform, expected=201)
    artifacts.append({'type': 'tenant', 'id': tenant['id'], 'name': tenant['name']})
    assert tenant['provisioning']['status'] == 'READY'
    new_admin = login(email, password)
    assert request('/auth/me', token=new_admin)['tenantId'] == tenant['id']
    assert request('/accounts', token=new_admin) == []
    request('/accounts/' + account_id, token=new_admin, expected=404)
    check('commercial onboarding provisions administrator and empty isolated hospital')
    user_email = RUN.lower() + '-user@example.com'
    user_input = {'name': 'QA Synthetic Billing', 'email': user_email, 'role': 'BILLING', 'password': password}
    request('/users', 'POST', {**user_input, 'role': 'PLATFORM_ADMIN'}, new_admin, expected=403)
    user = request('/users', 'POST', user_input, new_admin, expected=201)
    user_token = login(user_email, password)
    request('/users/' + user['id'], 'PATCH', {'active': False}, new_admin)
    request('/auth/me', token=user_token, expected=401)
    request('/auth/login', 'POST', {'email': user_email, 'password': password}, expected=401)
    check('hospital cannot escalate roles; deactivation revokes existing user session')
    own = create_account({**payload, 'folio': RUN + '-LICENSE'}, new_admin)
    own = request(f'/accounts/{own["id"]}/ready', 'POST', {'version': own['version'], 'acceptRisk': True, 'reason': 'Synthetic QA risk acceptance'}, new_admin)
    license = next(l for l in request('/licenses', token=platform) if l['tenantId'] == tenant['id'])
    license_change = {'version': license['version'], 'plan': 'QA suspended', 'status': 'SUSPENDED', 'monthlyAccountLimit': 7, 'seatLimit': 3, 'expiresAt': license['expiresAt']}
    request('/licenses/' + license['id'], 'PATCH', license_change, platform)
    request('/licenses/' + license['id'], 'PATCH', license_change, platform, expected=409)
    request('/accounts', 'POST', {**payload, 'folio': RUN + '-BLOCKED'}, new_admin, expected=402, headers={'Idempotency-Key': str(uuid.uuid4())})
    request(f'/accounts/{own["id"]}/send', 'POST', {'version': own['version']}, new_admin, expected=402)
    assert request('/accounts/' + own['id'], token=new_admin)['status'] == 'READY'
    assert request(f'/accounts/{own["id"]}/export?format=csv', token=new_admin, raw=True)
    check('suspended license blocks writes, retains reading/export and rejects stale configuration')
    request('/auth/logout', 'POST', {}, billing, expected=[200, 204])
    request('/auth/me', token=billing, expected=401)
    check('logout invalidates bearer session')


if __name__ == '__main__':
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report = {'run': RUN, 'startedAt': started, 'environment': 'local PostgreSQL + 4 Spring services; real HTTP; no payment/email/insurer integrations', 'checks': checks, 'requests': requests, 'artifacts': artifacts}
    try:
        main()
    except Exception as exc:
        report.update({'passed': False, 'error': str(exc), 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()})
        serialized = json.dumps(report, indent=2, ensure_ascii=False)
        (EVIDENCE / ('api-verification-' + RUN.lower() + '.json')).write_text(serialized)
        # Environment preflight failure must not overwrite a completed product run.
        latest = 'api-verification.json' if requests else 'api-preflight-failure.json'
        (EVIDENCE / latest).write_text(serialized)
        raise
    else:
        report.update({'passed': True, 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()})
        serialized = json.dumps(report, indent=2, ensure_ascii=False)
        (EVIDENCE / ('api-verification-' + RUN.lower() + '.json')).write_text(serialized)
        (EVIDENCE / 'api-verification.json').write_text(serialized)
        print(f'PASS: {len(checks)} integration groups / {len(requests)} HTTP requests')
