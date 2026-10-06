'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { post, saveSession, useResource } from '@/lib/api';
import { roleLabel } from '@/lib/format';
import type { DemoProfile, Session } from '@/lib/types';
import { Brand, Button, Icon, type IconName } from './ui';
import s from './login.module.css';

const demoPresentation: Record<DemoProfile['role'], { label: string; icon: IconName }> = {
  PLATFORM_ADMIN: { label: 'Administración Atlas', icon: 'layers' },
  HOSPITAL_ADMIN: { label: 'Administración', icon: 'building' },
  BILLING: { label: 'Caja y facturación', icon: 'accounts' },
  REVIEWER: { label: 'Auditoría', icon: 'review' },
  DIRECTOR: { label: 'Dirección', icon: 'chart' },
  INSURER_DEMO: { label: 'Aseguradora · lectura', icon: 'shield' },
};

function DemoProfilesSkeleton({ platform }: { platform: boolean }) {
  return <div role="status" aria-busy="true"><span className="sr-only">Cargando perfiles de demostración…</span><div className={`${s.demoGrid} ${platform ? s.demoSingle : ''}`} aria-hidden="true">{Array.from({ length: platform ? 1 : 6 }, (_, index) => <div className={`${s.demoProfile} ${s.skeleton}`} key={index}><span className={s.profileIcon}/><span className={s.skeletonLabel}/></div>)}</div></div>;
}

export default function Login({ platform = false, insurer = false }: { platform?: boolean; insurer?: boolean }) {
  const router = useRouter();
  const { data: profiles, error: profilesError, loading: profilesLoading, reload } = useResource<DemoProfile[]>('/auth/demo-profiles');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const system = platform ? 'control' : insurer ? 'insurer' : 'hospital';
  const systemName = platform ? 'Consola Atlas' : insurer ? 'Aseguradora · Demo de consulta' : 'Portal hospitalario';
  const photograph = platform ? '/images/hospital-facade.jpg' : insurer ? '/images/hospital.jpg' : '/images/healthcare-editorial.jpg';
  const photoDescription = platform ? 'Arquitectura hospitalaria; fotografía ilustrativa.' : insurer ? 'Interior de hospital; fotografía ilustrativa.' : 'Profesionales de salud revisando información; fotografía ilustrativa.';
  const filtered = profiles?.filter(profile => insurer ? profile.role === 'INSURER_DEMO' : (profile.role === 'PLATFORM_ADMIN') === platform) || [];

  function fillProfile(profile: DemoProfile) {
    setEmail(profile.email);
    setPassword(profile.password);
    setSelected(profile.email);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await post<Session>('/auth/login', { email, password });
      saveSession(session);
      router.push(session.user.role === 'PLATFORM_ADMIN' ? '/admin' : '/hospital');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
      setBusy(false);
    }
  }

  return <main className={s.login} data-login-system data-system={system}>
    <header className={s.header}>
      <Brand/>
      <Link href={platform || insurer ? '/login' : '/admin/login'} className={s.alternateLogin}>{platform || insurer ? 'Portal hospitalario' : 'Consola Atlas'}<Icon name="arrow" size={15}/></Link>
    </header>
    <div className={s.stage}>
      <div className={s.photoFrame} data-login-photo>
        <Image src={photograph} alt={photoDescription} fill sizes="(max-width: 760px) 0px, (max-width: 1100px) 42vw, 470px" className={s.photo}/>
      </div>
      <div className={s.accessColumn} data-login-content>
        <section className={s.access} aria-labelledby="login-title">
          <span className={s.accessTag}>{systemName}</span>
          <h1 id="login-title">Bienvenido<span>.</span></h1>
          <form onSubmit={submit} className={s.form} data-login-form aria-describedby={error ? 'login-error' : undefined}>
            <div className={s.field}>
              <label htmlFor="login-email">Correo institucional</label>
              <div className={s.inputShell}><Icon name="mail" size={18}/><input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={event => { setEmail(event.target.value); setSelected(''); }} placeholder="tu.nombre@hospital.mx" required/></div>
            </div>
            <div className={s.field}>
              <label htmlFor="login-password">Contraseña</label>
              <div className={s.inputShell}><Icon name="lock" size={18}/><input id="login-password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setSelected(''); }} placeholder="Tu contraseña" required/><button type="button" className={s.passwordToggle} onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}><Icon name="eye" size={18}/></button></div>
            </div>
            {error && <p className={s.error} id="login-error" role="alert"><Icon name="alert" size={16}/>{error}</p>}
            <Button type="submit" loading={busy} className={s.submit}>Iniciar sesión<Icon name="arrow" size={18}/></Button>
          </form>
        </section>
        <section className={s.demos} data-login-demos aria-labelledby="demo-heading" aria-describedby="demo-instruction">
          <h2 id="demo-heading">Usuarios demo</h2>
          <p id="demo-instruction" className="sr-only">Selecciona un rol para completar el correo y la contraseña. Después, pulsa Iniciar sesión. Los datos son ficticios.</p>
          {profilesLoading ? <DemoProfilesSkeleton platform={platform || insurer}/> : profilesError ? <div className={s.demoLoading} role="alert"><p>No pudimos cargar los perfiles.</p><button type="button" onClick={reload}>Intentar de nuevo</button></div> : filtered.length === 0 ? <p className={s.demoLoading}>Los perfiles de demostración no están habilitados.</p> : <div className={`${s.demoGrid} ${platform || insurer ? s.demoSingle : ''}`}>
            {filtered.map(profile => {
              const disabled = profile.name === 'Cuenta desactivada';
              const presentation = demoPresentation[profile.role];
              return <button type="button" key={profile.email} onClick={() => fillProfile(profile)} className={`${s.demoProfile} ${selected === profile.email ? s.selected : ''}`} aria-pressed={selected === profile.email} aria-label={`${disabled ? 'Cuenta desactivada' : `${roleLabel[profile.role]}, ${profile.name}`}, ${profile.email}`} title={`${profile.name} · ${profile.email}`} data-testid={`demo-${disabled ? 'disabled' : profile.role.toLowerCase()}`}>
                <span className={s.profileIcon}><Icon name={disabled ? 'lock' : presentation.icon} size={16}/></span>
                <span className={s.profileLabel}>{disabled ? 'Cuenta desactivada' : presentation.label}</span>
                <span className="sr-only">{profile.email}</span>
                <Icon name={selected === profile.email ? 'check' : 'chevron'} size={14} className={s.profileCheck}/>
              </button>;
            })}
          </div>}
          <div className={s.demoStatus} aria-live="polite">{selected && <><Icon name="check" size={13}/><span>Datos listos para iniciar sesión.</span></>}</div>
        </section>
      </div>
    </div>
    <footer className={s.footer}><span>© 2026 Atlas Link</span><Link href="/#espacios">Todos los espacios</Link><Link href="/privacidad">Privacidad y datos</Link></footer>
  </main>;
}
