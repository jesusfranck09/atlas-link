#!/usr/bin/env python3
"""Validate fresh schema and demo data inside a rolled-back transaction, as each owner."""
import json
import subprocess
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from dev import pg, SOCKET, PORT

migrations = {
    'identity': ROOT / 'backend/ntx-msa-identity-service/src/main/resources/db/migration',
    'control': ROOT / 'backend/ntx-msa-control-service/src/main/resources/db/migration',
    'hospital': ROOT / 'backend/ntx-msa-hospital-service/src/main/resources/db/migration',
}
parts = ['BEGIN;']
for service in ('identity', 'control', 'hospital'):
    parts.append('SET LOCAL ROLE atlas_' + service + '_owner;')
    for path in sorted(migrations[service].glob('*.sql')):
        parts.append(path.read_text().replace('${demoEnabled}', 'true'))
    parts.append('RESET ROLE;')
parts.append("""
DO $$ BEGIN
 IF (SELECT count(*) FROM identity.app_user) <> 8 THEN RAISE EXCEPTION 'Seed users count'; END IF;
 IF (SELECT count(*) FROM hospital.hospital_account) <> 20 THEN RAISE EXCEPTION 'Seed accounts count'; END IF;
 IF EXISTS(SELECT 1 FROM hospital.evaluation WHERE billed_total <> tariff_adjustment + insurer_estimate + patient_estimate + unresolved_amount) THEN RAISE EXCEPTION 'Financial reconciliation'; END IF;
END $$;
SET LOCAL ROLE atlas_hospital;
DO $$ BEGIN
 IF (SELECT count(*) FROM hospital.hospital_account) <> 0 THEN RAISE EXCEPTION 'RLS empty context'; END IF;
END $$;
SELECT set_config('app.tenant_id','11111111-1111-1111-1111-111111111111',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM hospital.hospital_account) <> 18 THEN RAISE EXCEPTION 'RLS principal'; END IF;
END $$;
SELECT set_config('app.tenant_id','22222222-2222-2222-2222-222222222222',true);
SELECT set_config('app.platform_admin','true',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM hospital.hospital_account) <> 2 THEN RAISE EXCEPTION 'RLS second tenant or platform bypass'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_table_privilege('atlas_hospital','identity.app_user','SELECT') THEN RAISE EXCEPTION 'Cross-service grant'; END IF;
END $$;
ROLLBACK;
""")
result = subprocess.run([pg('psql'), '-X', '-h', str(SOCKET), '-p', str(PORT), '-d', 'atlas_link',
                         '-v', 'ON_ERROR_STOP=1', '-q'], input='\n'.join(parts), text=True, capture_output=True)
report = {'passed': result.returncode == 0,
          'checks': ['owner migrations', 'demo seeds', 'exact money reconciliation', 'RLS empty context', 'RLS main tenant', 'RLS secondary tenant', 'platform cannot bypass RLS', 'no cross-service grant'],
          'committed': False}
(ROOT / 'evidence/schema-verification.json').write_text(json.dumps(report, indent=2))
if result.returncode:
    print(result.stderr[-6000:])
    raise SystemExit(result.returncode)
print('PASS: migrations, seeds, reconciliation, RLS and service grants. Transaction rolled back.')
