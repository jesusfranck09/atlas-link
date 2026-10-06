'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { post, saveSession, useResource } from '@/lib/api';
import { roleLabel } from '@/lib/format';
import type { DemoProfile, Session } from '@/lib/types';
import { Button, Icon, type IconName } from './ui';
import s from './login.module.css';

const demoPresentation: Record<DemoProfile['role'], { label: string; icon: IconName }> = {
  PLATFORM_ADMIN: { label: 'Administración Atlas', icon: 'layers' },
  HOSPITAL_ADMIN: { label: 'Administración', icon: 'building' },
  BILLING: { label: 'Caja y facturación', icon: 'accounts' },
  REVIEWER: { label: 'Auditoría', icon: 'review' },
  DIRECTOR: { label: 'Dirección', icon: 'chart' },
  INSURER_DEMO: { label: 'Aseguradora · lectura', icon: 'shield' },
};

function DemoLoading({ label }: { label: string }) {
  return <p className={s.demoLoading} role="status"><span className="sr-only">Cargando acceso de demostración…</span>{label}</p>;
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
  const filtered = profiles?.filter(profile => insurer ? profile.role === 'INSURER_DEMO' : platform ? profile.role === 'PLATFORM_ADMIN' : profile.role !== 'PLATFORM_ADMIN' && profile.role !== 'INSURER_DEMO') || [];

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

  const copy = system === 'hospital' ? {
    system: 'Portal hospitalario',
    heading: 'HOSPITAL',
    access: 'Acceso al portal hospitalario',
    accessDescription: 'Inicia sesión con tu cuenta institucional.',
    accessScope: 'CUENTAS · CONVENIOS · PREAUDITORÍA',
    emailLabel: 'Correo institucional',
    emailPlaceholder: 'tu.nombre@hospital.mx',
    authTitle: 'Acceso clínico',
    submit: 'Entrar al portal',
    demoLabel: 'Perfiles de demostración',
    document: 'clinical',
  } : system === 'control' ? {
    system: 'Consola de administración',
    heading: 'ATLAS',
    access: 'Acceso a Consola Atlas',
    accessDescription: 'Reservado para administración de plataforma.',
    accessScope: 'ORGANIZACIONES · LICENCIAS · CAPACIDAD',
    emailLabel: 'Cuenta de administración',
    emailPlaceholder: 'admin@atlaslink.mx',
    authTitle: 'Administrar Atlas',
    submit: 'Abrir consola',
    demoLabel: 'Perfil de demostración',
    document: 'license',
  } : {
    system: 'Portal de aseguradora',
    heading: 'ASEGURADORA',
    access: 'Acceso de consulta',
    accessDescription: 'Ingresa con tus credenciales institucionales.',
    accessScope: 'ARCHIVO COMPARTIDO · SOLO LECTURA',
    emailLabel: 'Correo de consulta',
    emailPlaceholder: 'nombre@aseguradora.mx',
    authTitle: 'Consulta documental',
    submit: 'Consultar expedientes',
    demoLabel: 'Acceso de demostración',
    document: 'claim',
  };

  const profileButton = (profile: DemoProfile) => {
    const disabled = profile.name === 'Cuenta desactivada';
    const presentation = demoPresentation[profile.role];
    const label = (disabled ? 'Cuenta desactivada' : roleLabel[profile.role] + ', ' + profile.name) + ', ' + profile.email;
    return <button type="button" key={profile.email} onClick={() => fillProfile(profile)} className={s.demoProfile + (selected === profile.email ? ' ' + s.selected : '')} aria-pressed={selected === profile.email} aria-label={label} title={profile.name + ' · ' + profile.email} data-testid={'demo-' + (disabled ? 'disabled' : profile.role.toLowerCase())}>
      <span className={s.profileIcon}><Icon name={disabled ? 'lock' : presentation.icon} size={16}/></span>
      <span className={s.profileLabel}>{disabled ? 'Cuenta desactivada' : presentation.label}</span>
      <span className="sr-only">{profile.email}</span>
      <Icon name={selected === profile.email ? 'check' : 'arrow'} size={14} className={s.profileCheck}/>
    </button>;
  };

  const demoState = profilesLoading
    ? <DemoLoading label="Cargando perfiles"/>
    : profilesError
      ? <div className={s.demoLoading} role="alert"><p>No se pudieron cargar los perfiles.</p><button type="button" onClick={reload}>Intentar de nuevo</button></div>
      : filtered.length ? filtered.map(profileButton) : <p className={s.demoLoading}>Los perfiles de demostración no están habilitados.</p>;

  const credentialForm = <form onSubmit={submit} className={s.form} data-login-form aria-describedby={error ? 'login-error' : undefined}>
    <div className={s.field}>
      <label htmlFor="login-email">{copy.emailLabel}</label>
      <div className={s.inputShell}><Icon name="mail" size={18}/><input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={event => { setEmail(event.target.value); setSelected(''); }} placeholder={copy.emailPlaceholder} required/></div>
    </div>
    <div className={s.field}>
      <label htmlFor="login-password">Contraseña</label>
      <div className={s.inputShell}><Icon name="lock" size={18}/><input id="login-password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setSelected(''); }} placeholder="Tu contraseña" required/><button type="button" className={s.passwordToggle} onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}><Icon name="eye" size={18}/></button></div>
    </div>
    {error && <p className={s.error} id="login-error" role="alert"><Icon name="alert" size={16}/>{error}</p>}
    <Button type="submit" loading={busy} className={s.submit}>{copy.submit}<Icon name="arrow" size={18}/></Button>
  </form>;

  return <main className={s.login} data-login-system data-system={system}>
    <div className={s.canvas}>
      <header className={s.masthead}>
        <Link href="/" className={s.mastheadBrand} aria-label="Atlas Link, página principal">ATLAS LINK <span>·</span> {copy.system.toUpperCase()}</Link>
        <i aria-hidden="true"/>
        <span className={s.mastheadNote}>{system === 'hospital' ? 'SISTEMA CLÍNICO' : system === 'control' ? 'PLATAFORMA · CONTROL DE RED' : 'CONSULTA · SOLO LECTURA'}</span>
        <Link href="/" className={s.backLink}>Todos los accesos <Icon name="arrow" size={15}/></Link>
      </header>

      <div className={s.editorialLayout} data-document={copy.document}>
        <section className={s.brandColumn} aria-label="Acceso a la plataforma">
          <section className={s.authCard} data-system={system} aria-labelledby="auth-title">
            <div className={s.authBrand}><span className={s.authGlyph}><Icon name={system === 'insurer' ? 'shield' : system === 'control' ? 'layers' : 'heart'} size={18}/></span><span>ATLAS LINK</span></div>
            <p className={s.authKicker}>{system === 'insurer' ? 'DEMO · SOLO LECTURA' : system === 'control' ? 'ADMINISTRACIÓN DE PLATAFORMA' : 'ESTACIÓN HOSPITALARIA'}</p>
            <h2 id="auth-title">{copy.authTitle}</h2>
            <p className={s.authDescription}>{copy.accessDescription}</p>
            <p className={s.accessScope}>{copy.accessScope}</p>
            {credentialForm}
            <details className={s.demoDisclosure} open>
              <summary>{copy.demoLabel}<Icon name="chevron" size={15}/></summary>
              <div className={s.demoList}>{demoState}</div>
              {selected && <div className={s.demoStatus} aria-live="polite"><Icon name="check" size={13}/> Perfil seleccionado.</div>}
            </details>
          </section>
        </section>

        <section className={s.documentStage} aria-label={system === 'hospital' ? 'Vista de muestra de expediente clínico' : system === 'control' ? 'Vista de muestra de cédula de licencia' : 'Vista de muestra de estado de cuenta'}>
          <div className={s.documentHeading}><span aria-hidden="true"/><h1 id="system-heading">{copy.heading}</h1></div>
          <div className={s.paperShadow} aria-hidden="true"/>
          {system === 'hospital' ? <article className={`${s.documentPaper} ${s.clinicalRecord}`} aria-label="Expediente clínico sintético, demostración">
            <header className={s.paperHeader}><span className={s.paperLogo}><i/> ATLAS LINK <small>HOSPITAL</small></span><span className={s.paperSerial}>MUESTRA<br/>SINTÉTICA</span></header>
            <div className={s.paperTitle}><p>REGISTRO ASISTENCIAL · DEMOSTRACIÓN</p><h2>Expediente<br/>clínico</h2><span>Vista documental de una cuenta hospitalaria</span></div>
            <div className={s.paperRule}/>
            <div className={s.clinicalIdentity}><span>REFERENCIA SINTÉTICA</span><strong>HSP · 0284</strong><small>Hospital Aurora · Unidad de demostración</small></div>
            <div className={s.paperFields}><div><span>INGRESO</span><strong>14 sep 2026</strong></div><div><span>COBERTURA</span><strong>Convenio demostrativo</strong></div></div>
            <section className={s.recordSection}><h3>Contenido del expediente</h3><div><span>01</span><b>Cuenta hospitalaria</b><i/></div><div><span>02</span><b>Convenio aplicable</b><i/></div><div><span>03</span><b>Registro de preauditoría</b><i/></div></section>
            <footer className={s.paperFooter}><Icon name="shield" size={14}/><span>Solo datos sintéticos<br/>No corresponde a una persona ni atención real.</span><b>01 / 03</b></footer>
          </article> : system === 'control' ? <article className={`${s.documentPaper} ${s.licenseSheet}`} aria-label="Cédula de licencia de demostración">
            <header className={s.paperHeader}><span className={s.paperLogo}><i/> ATLAS LINK <small>CONTROL</small></span><span className={s.paperSerial}>DEMO<br/>PLATAFORMA</span></header>
            <div className={s.licenseTitle}><p>REGISTRO DE PLATAFORMA · 2026</p><h2>Cédula de<br/>licencia</h2><span>Organización hospitalaria · Información de muestra</span></div>
            <div className={s.licenseMeta}><div><span>ORGANIZACIÓN</span><strong>Hospital de demostración</strong></div><div><span>PLAN</span><strong>Prueba</strong></div></div>
            <div className={s.capacityLedger}><div className={s.ledgerHeading}><span>CAPACIDAD MENSUAL</span><span>DATOS SINTÉTICOS</span></div><div className={s.ledgerNumber}><strong>120</strong><span>cuentas<br/>de referencia</span></div><div className={s.ledgerTrack}><i/></div><div className={s.ledgerScale}><span>0</span><span>60</span><span>120</span></div></div>
            <div className={s.licenseFoot}><span>Vigencia demostrativa</span><strong>01 oct — 31 dic 2026</strong><Icon name="key" size={17}/></div>
            <footer className={s.paperFooter}><Icon name="layers" size={14}/><span>Hoja de muestra<br/>No representa una licencia activa.</span><b>ATLAS / 01</b></footer>
          </article> : <article className={`${s.documentPaper} ${s.claimSheet}`} aria-label="Estado de cuenta de demostración para consulta">
            <header className={s.paperHeader}><span className={s.paperLogo}><i/> ATLAS LINK <small>CONSULTA</small></span><span className={s.paperSerial}>DEMO<br/>LECTURA</span></header>
            <div className={s.claimTop}><p>ESTADO DE CUENTA · SOLO LECTURA</p><span>FOLIO</span><strong>AC · 00412</strong></div>
            <div className={s.claimAmount}><span>IMPORTE DE REFERENCIA · SINTÉTICO</span><strong>$ 48,260<span>.00</span></strong><small>Pesos mexicanos · valor de demostración</small></div>
            <div className={s.claimRows}><div><span>ENTIDAD</span><strong>Hospital de demostración</strong></div><div><span>CONCEPTO</span><strong>Cuenta hospitalaria</strong></div><div><span>COBERTURA</span><strong>Convenio demostrativo</strong></div><div><span>ESTADO DOCUMENTAL</span><strong><i/> Disponible para consulta</strong></div></div>
            <div className={s.claimStamp}>SOLO<br/>CONSULTA</div>
            <footer className={s.paperFooter}><Icon name="eye" size={14}/><span>Vista de muestra<br/>No constituye autorización de pago.</span><b>DEMO / 01</b></footer>
          </article>}
          {system === 'hospital' && <div className={s.paperClip} aria-hidden="true"/>}
          {system === 'control' && <div className={s.documentTab} aria-hidden="true">ATLAS</div>}
          {system === 'insurer' && <div className={s.documentSeal} aria-hidden="true">DEMO</div>}
        </section>
      </div>

      <footer className={s.canvasFooter}><span>IDEAS <i/> SISTEMAS <i/> PERSONAS</span><Link href="/privacidad">Privacidad y datos</Link><span>© 2026 ATLAS LINK</span></footer>
    </div>
  </main>;
}
