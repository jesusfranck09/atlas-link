#!/usr/bin/env python3
"""Provision the FIRST platform administrator offline. Never changes an existing user."""
import argparse
import getpass
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from dev import pg

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--email', required=True)
parser.add_argument('--name', required=True)
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', type=int, default=5440)
parser.add_argument('--database', default='atlas_link')
args = parser.parse_args()
email = args.email.strip().lower()
name = args.name.strip()
if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or email.endswith('@demo.atlaslink.mx'):
    raise SystemExit('Utiliza un correo válido ajeno a las identidades reservadas de demostración.')
if not 2 <= len(name) <= 120:
    raise SystemExit('El nombre debe tener entre 2 y 120 caracteres.')
password = os.environ.get('ATLAS_BOOTSTRAP_PASSWORD') or getpass.getpass('Contraseña del primer administrador (no se mostrará): ')
if not 12 <= len(password.encode('utf-8')) <= 72:
    raise SystemExit('La contraseña debe tener entre 12 y 72 bytes UTF-8.')
env = os.environ.copy()
if 'PGPASSWORD' not in env:
    runtime = ROOT / '.local/runtime.json'
    if not runtime.exists():
        raise SystemExit('Configura PGPASSWORD para el propietario identity; no hay credencial local.')
    env['PGPASSWORD'] = json.loads(runtime.read_text())['roles']['atlas_identity_owner']
owner = os.environ.get('ATLAS_IDENTITY_OWNER', 'atlas_identity_owner')
def quote(text):
    return "'" + text.replace("'", "''") + "'"
command = f"""
BEGIN;
SELECT pg_advisory_xact_lock(191997251);
DO $bootstrap$
BEGIN
 IF EXISTS(SELECT 1 FROM identity.app_user WHERE role = 'PLATFORM_ADMIN') THEN
   RAISE EXCEPTION 'Ya existe un administrador de plataforma. No se modificó ninguna credencial.';
 END IF;
END $bootstrap$;
INSERT INTO identity.app_user(id,tenant_id,name,email,password_hash,role,active)
VALUES(gen_random_uuid(),NULL,{quote(name)},{quote(email)},crypt({quote(password)},gen_salt('bf',12)),'PLATFORM_ADMIN',true);
COMMIT;
"""
result = subprocess.run([pg('psql'), '-X', '-h', args.host, '-p', str(args.port), '-U', owner,
                         '-d', args.database, '-v', 'ON_ERROR_STOP=1', '-q'],
                        input=command, text=True, capture_output=True, env=env)
if result.returncode:
    # Do not print SQL errors: their context may contain the password literal.
    print('No se provisionó el administrador. Comprueba que la base esté migrada, sin administrador previo y que el rol propietario tenga acceso.', file=sys.stderr)
    raise SystemExit(result.returncode)
print('Primer administrador creado. Elimina ATLAS_BOOTSTRAP_PASSWORD del entorno y usa ATLAS_AUTH_MODE=local sin datos demo.')
