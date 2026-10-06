#!/usr/bin/env python3
"""Local Atlas Link lifecycle. Own cluster, databases, credentials and processes only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'
PGDATA = LOCAL / 'postgres'
SOCKET = LOCAL / 'socket'
PORT = 5440
SERVICES = {'identity-service': 18491, 'control-service': 18492, 'hospital-service': 18493, 'gateway': 8095}
SERVICE_DIRS = {'identity-service': 'ntx-msa-identity-service', 'control-service': 'ntx-msa-control-service', 'hospital-service': 'ntx-msa-hospital-service', 'gateway': 'ntx-msa-gateway'}


def run(args, **kw):
    return subprocess.run([str(a) for a in args], check=True, **kw)


def pg(name):
    found = shutil.which(name)
    if found:
        return found
    for base in ('/opt/homebrew/opt/postgresql@15/bin', '/usr/local/opt/postgresql@15/bin'):
        path = Path(base) / name
        if path.exists():
            return str(path)
    raise SystemExit('Instala PostgreSQL 15+ y agrega sus binarios al PATH.')


def config():
    LOCAL.mkdir(mode=0o700, exist_ok=True)
    path = LOCAL / 'runtime.json'
    if path.exists():
        return json.loads(path.read_text())
    data = {'internalKey': secrets.token_urlsafe(48), 'roles': {}}
    for service in ('identity', 'control', 'hospital'):
        for suffix in ('', '_owner'):
            data['roles']['atlas_' + service + suffix] = secrets.token_urlsafe(32)
    path.write_text(json.dumps(data, indent=2))
    path.chmod(0o600)
    return data


def sql(command, database='postgres'):
    return run([pg('psql'), '-X', '-h', SOCKET, '-p', str(PORT), '-d', database,
                '-v', 'ON_ERROR_STOP=1', '-At'], input=command, text=True, capture_output=True).stdout.strip()


def db_start():
    data = config()
    SOCKET.mkdir(mode=0o700, exist_ok=True)
    if not (PGDATA / 'PG_VERSION').exists():
        run([pg('initdb'), '-D', PGDATA, '--auth-local=trust', '--auth-host=scram-sha-256',
             '--encoding=UTF8', '--locale=C'], stdout=subprocess.DEVNULL)
    check = subprocess.run([pg('pg_ctl'), '-D', str(PGDATA), 'status'], capture_output=True)
    if check.returncode:
        run([pg('pg_ctl'), '-D', PGDATA, '-l', LOCAL / 'postgres.log',
             '-o', f'-p {PORT} -h 127.0.0.1 -k {SOCKET}', '-w', 'start'])
    for name, password in data['roles'].items():
        exists = sql(f"SELECT 1 FROM pg_roles WHERE rolname = '{name}'")
        if not exists:
            sql(f"CREATE ROLE {name} LOGIN PASSWORD '{password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS")
    if not sql("SELECT 1 FROM pg_database WHERE datname = 'atlas_link'"):
        sql('CREATE DATABASE atlas_link')
    sql('REVOKE CREATE ON SCHEMA public FROM PUBLIC; CREATE EXTENSION IF NOT EXISTS pgcrypto;', 'atlas_link')
    for service in ('identity', 'control', 'hospital'):
        sql(f'GRANT CREATE ON DATABASE atlas_link TO atlas_{service}_owner; '
            f'CREATE SCHEMA IF NOT EXISTS {service} AUTHORIZATION atlas_{service}_owner; '
            f'GRANT USAGE ON SCHEMA {service} TO atlas_{service};', 'atlas_link')
    print('PostgreSQL Atlas Link: localhost:5440 / atlas_link (cluster aislado).')


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def belongs_to_project(pid):
    result = subprocess.run(['ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True)
    return result.returncode == 0 and str(ROOT) in result.stdout


def start_process(name, args, cwd, env):
    pidfile = LOCAL / (name + '.pid')
    if pidfile.exists() and alive(int(pidfile.read_text())) and belongs_to_project(int(pidfile.read_text())):
        print(name + ' ya está activo.')
        return
    with (LOCAL / (name + '.log')).open('ab') as log:
        p = subprocess.Popen([str(a) for a in args], cwd=cwd, env=env,
                             stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    pidfile.write_text(str(p.pid))
    print(f'{name}: PID {p.pid}; log .local/{name}.log')


def env_for(service):
    data = config()
    env = os.environ.copy()
    env.update({'SPRING_PROFILES_ACTIVE': 'demo', 'ATLAS_DEMO_ENABLED': 'true',
                'DEMO_ENABLED': 'true', 'INTERNAL_API_KEY': data['internalKey'],
                'ATLAS_INTERNAL_KEY': data['internalKey'],
                'DB_URL': f'jdbc:postgresql://127.0.0.1:{PORT}/atlas_link',
                'IDENTITY_URL': 'http://127.0.0.1:18491', 'CONTROL_URL': 'http://127.0.0.1:18492',
                'HOSPITAL_URL': 'http://127.0.0.1:18493', 'PORT': str(SERVICES[service]),
                'SERVER_PORT': str(SERVICES[service]), 'SERVER_ADDRESS': '127.0.0.1'})
    short = service.replace('-service', '')
    if short in ('identity', 'control', 'hospital'):
        role = 'atlas_' + short
        env.update({'DB_USER': role, 'DB_PASSWORD': data['roles'][role], 'DB_SCHEMA': short,
                    'FLYWAY_USER': role + '_owner', 'FLYWAY_PASSWORD': data['roles'][role + '_owner']})
    return env


def wait_http(url, timeout=50):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def write_configs():
    keys = ('PORT', 'DB_URL', 'DB_USER', 'DB_PASSWORD', 'DB_SCHEMA', 'FLYWAY_USER', 'FLYWAY_PASSWORD',
            'ATLAS_DEMO_ENABLED', 'DEMO_ENABLED', 'INTERNAL_API_KEY', 'ATLAS_INTERNAL_KEY',
            'IDENTITY_URL', 'CONTROL_URL', 'HOSPITAL_URL')
    for service in SERVICES:
        env = env_for(service)
        values = {key: env[key] for key in keys if key in env}
        values['server'] = {'port': SERVICES[service], 'address': '127.0.0.1'}
        path = LOCAL / (service + '.yml')
        path.write_text(json.dumps(values, indent=2))
        path.chmod(0o600)
    artifacts = {service: str(runtime_jar(service)) for service in SERVICES}
    (LOCAL / 'artifacts.json').write_text(json.dumps(artifacts, indent=2))
    print('Configuración local privada preparada; no se muestran secretos.')


def runtime_jar(service):
    source = ROOT / 'backend' / SERVICE_DIRS[service] / 'target' / (service + '-0.1.0.jar')
    if not source.exists():
        raise SystemExit(f'Compila primero {service}.')
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    directory = LOCAL / 'artifacts'
    directory.mkdir(exist_ok=True)
    target = directory / (service + '-' + digest + '.jar')
    if not target.exists():
        shutil.copyfile(source, target)
    return target


def runtime_web():
    frontend = ROOT / 'frontend' / 'nxt-ui-atlas-link'
    build_id = frontend / '.next/BUILD_ID'
    standalone = frontend / '.next/standalone'
    if not build_id.exists() or not standalone.exists():
        raise SystemExit('Compila primero frontend: npm run build (output standalone).')
    identifier = build_id.read_text().strip()
    if not identifier or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-' for c in identifier):
        raise SystemExit('BUILD_ID de Next no válido.')
    release = LOCAL / 'web' / identifier
    if not (release / '.complete').exists():
        release.mkdir(parents=True, exist_ok=True)
        shutil.copytree(standalone, release, dirs_exist_ok=True)
        shutil.copytree(frontend / '.next/static', release / '.next/static', dirs_exist_ok=True)
        shutil.copytree(frontend / 'public', release / 'public', dirs_exist_ok=True)
        (release / '.complete').touch()
    return release


def start(build=False, backend_only=False):
    db_start()
    if build:
        run(['mvn', '-q', 'package', '-DskipTests'], cwd=ROOT / 'backend')
        if not backend_only:
            run(['npm', 'run', 'build'], cwd=ROOT / 'frontend' / 'nxt-ui-atlas-link')
    for service, port in SERVICES.items():
        jar = runtime_jar(service)
        start_process(service, ['java', '-jar', jar], ROOT, env_for(service))
        if not wait_http(f'http://127.0.0.1:{port}/actuator/health'):
            raise SystemExit(f'{service} no está listo; revisa .local/{service}.log')
    if backend_only:
        print('Servicios disponibles en gateway http://localhost:8095')
        return
    env = os.environ.copy()
    env['API_URL'] = 'http://127.0.0.1:8095'
    env.update({'HOSTNAME': '127.0.0.1', 'PORT': '4300', 'NODE_ENV': 'production'})
    release = runtime_web()
    start_process('web', ['node', release / 'server.js'], release, env)
    if not wait_http('http://localhost:4300'):
        raise SystemExit('Web no está lista; revisa .local/web.log')
    print('\nAtlas Link: http://localhost:4300\nConsola: http://localhost:4300/admin/login')


def stop(include_db=False):
    for name in ['web', *reversed(SERVICES)]:
        path = LOCAL / (name + '.pid')
        if path.exists():
            pid = int(path.read_text())
            if alive(pid):
                # Verify this PID still belongs to this project before sending a signal.
                if belongs_to_project(pid):
                    if os.getpgid(pid) == pid:
                        os.killpg(pid, signal.SIGTERM)
                    else:
                        os.kill(pid, signal.SIGTERM)
                    print('Detenido: ' + name)
            path.unlink()
    if include_db and (PGDATA / 'postmaster.pid').exists():
        run([pg('pg_ctl'), '-D', PGDATA, '-m', 'fast', '-w', 'stop'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['db', 'start', 'stop', 'status', 'config', 'stage-web'])
    parser.add_argument('--build', action='store_true')
    parser.add_argument('--database', action='store_true', help='También detiene el cluster propio.')
    parser.add_argument('--backend-only', action='store_true', help='Arranca solo microservicios.')
    args = parser.parse_args()
    if args.action == 'stage-web':
        config()
        print(runtime_web())
    elif args.action == 'config':
        write_configs()
    elif args.action == 'db':
        db_start()
    elif args.action == 'start':
        start(args.build, args.backend_only)
    elif args.action == 'stop':
        stop(args.database)
    else:
        for service, port in {**SERVICES, 'web': 4300}.items():
            url = f'http://127.0.0.1:{port}' + ('' if service == 'web' else '/actuator/health')
            print(service + ': ' + ('OK' if wait_http(url, 2) else 'detenido'))
