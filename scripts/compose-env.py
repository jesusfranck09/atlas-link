#!/usr/bin/env python3
"""Create private, random credentials for the isolated Compose demonstration."""
from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
directory = root / '.local'
directory.mkdir(mode=0o700, exist_ok=True)
path = directory / 'compose.env'
if path.exists():
    print('La configuración Compose ya existe; se conserva sin rotar credenciales.')
else:
    keys = ['POSTGRES_PASSWORD', 'INTERNAL_API_KEY', 'IDENTITY_PASSWORD', 'IDENTITY_OWNER_PASSWORD',
            'CONTROL_PASSWORD', 'CONTROL_OWNER_PASSWORD', 'HOSPITAL_PASSWORD', 'HOSPITAL_OWNER_PASSWORD']
    path.write_text('\n'.join(key + '=' + secrets.token_hex(32) for key in keys) + '\nWEB_PORT=4430\n')
    path.chmod(0o600)
    print('Credenciales aleatorias guardadas en .local/compose.env; no se muestran secretos.')
