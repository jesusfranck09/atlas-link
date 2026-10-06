'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { post } from '@/lib/api';
import { Brand, Button, Field, Icon, type IconName } from './ui';
import { LandingDonut } from './landing-donut';
import { useScrollReveal } from './use-scroll-reveal';
import s from './landing.module.css';

const segments = [
  { label: 'Preparadas', value: 12 },
  { label: 'En revisión', value: 5 },
  { label: 'Por resolver', value: 3 },
];

const steps: { number: string; title: string; detail: string }[] = [
  { number: '01', title: 'Recibe', detail: 'Una cuenta ordenada desde el inicio.' },
  { number: '02', title: 'Contrasta', detail: 'Conceptos frente al convenio.' },
  { number: '03', title: 'Revisa', detail: 'Hallazgos con criterio humano.' },
  { number: '04', title: 'Prepara', detail: 'El siguiente paso documentado.' },
];

const roles: { name: string; icon: IconName; description: string; href: string }[] = [
  { name: 'Caja', icon: 'accounts', description: 'Recibe y organiza cada cuenta.', href: '/login' },
  { name: 'Auditoría', icon: 'shield', description: 'Examina hallazgos y deja constancia.', href: '/login' },
  { name: 'Dirección', icon: 'chart', description: 'Sigue la operación con contexto.', href: '/login' },
];

export default function Landing() {
  const site = useRef<HTMLDivElement>(null);
  useScrollReveal(site);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await post('/leads', {
        name: data.get('name'),
        email: data.get('email'),
        organization: data.get('organization'),
        message: data.get('message'),
        consent: data.get('consent') === 'on',
      });
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar tu solicitud. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return <div ref={site} className={s.site}>
    <a href="#contenido" className="skip-link">Ir al contenido</a>
    <header className={s.header}>
      <div className={s.headerInner}>
        <Brand />
        <nav id="public-menu" className={`${s.nav} ${menuOpen ? s.navOpen : ''}`} aria-label="Navegación principal">
          <a href="#metodo" onClick={() => setMenuOpen(false)}>Método</a>
          <a href="#plataforma" onClick={() => setMenuOpen(false)}>Plataforma</a>
          <a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
        </nav>
        <div className={s.headerActions}>
          <Link href="/login" className={s.signIn}>Acceder <Icon name="arrowUp" size={16} /></Link>
          <button type="button" className={s.menuButton} onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={menuOpen} aria-controls="public-menu"><Icon name={menuOpen ? 'close' : 'menu'} size={20} /></button>
        </div>
      </div>
    </header>

    <main id="contenido">
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroCopy}>
          <p className={s.eyebrow}><span className={s.eyebrowLine} aria-hidden="true" /> Atlas Link <span className={s.eyebrowDivider}>·</span> Preauditoría hospitalaria</p>
          <h1 id="hero-title">Claridad antes<br />de cada <em>envío.</em></h1>
          <p className={s.heroLead}>Cuentas, convenios y hallazgos conectados para que tu equipo decida con contexto.</p>
          <div className={s.heroActions}>
            <a href="#contacto" className={s.primary}>Conocer Atlas <Icon name="arrow" size={17} /></a>
            <Link href="/login" className={s.secondary}>Explorar demo <Icon name="arrowUp" size={17} /></Link>
          </div>
          <div className={s.heroIndex}><span className={s.heroIndexMark} aria-hidden="true" /><span>De la cuenta a la decisión</span></div>
        </div>

        <figure className={s.heroVisual}>
          <div className={s.photoFrame}>
            <Image src="/images/healthcare-editorial.jpg" alt="Dos profesionales de salud revisan información en una tablet y una computadora" fill priority sizes="(max-width: 760px) 100vw, (max-width: 1100px) 48vw, 43vw" />
          </div>
          <figcaption className={s.photoCaption}><span>Personas al centro.</span><strong>Decisiones con contexto.</strong></figcaption>
          <div className={s.heroData}>
            <LandingDonut segments={segments} totalLabel="Cuentas" totalValue="20" className={s.donut} />
          </div>
        </figure>
      </section>

      <section id="metodo" className={s.method} aria-labelledby="method-title" data-reveal>
        <div className={s.sectionMeta}><span>01 / Método</span><h2 id="method-title">Un recorrido claro.</h2></div>
        <ol className={s.stepList}>
          {steps.map(step => <li key={step.number}><span className={s.stepNumber}>{step.number}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></li>)}
        </ol>
      </section>

      <section id="plataforma" className={s.platform} aria-labelledby="platform-title">
        <div className={s.platformIntro} data-reveal>
          <p className={s.kicker}>02 / Plataforma</p>
          <h2 id="platform-title">Cada cifra tiene una historia.</h2>
          <p>Del cargo recibido al hallazgo revisado. La información esencial, en un solo lugar.</p>
          <Link href="/login" className={s.inlineLink}>Recorrer la demostración <Icon name="arrow" size={17} /></Link>
        </div>
        <div className={s.productWindow} data-reveal role="group" aria-label="Vista ilustrativa de una cuenta hospitalaria">
          <div className={s.windowTop}><div className={s.windowIdentity}><span className={s.windowMark}>a.</span><span>Atlas Link <span className={s.windowSlash}>/</span> Cuentas</span></div><span className={s.demoPill}><span /> DEMO</span></div>
          <div className={s.accountHeader}><div><span>CUENTA HOSPITALARIA · HSP-0284</span><h3>Una cuenta, todo el contexto.</h3></div><span className={s.reviewBadge}><i /> En revisión</span></div>
          <div className={s.accountSummary}><div><span>Importe recibido</span><strong>$48,600.00 <small>MXN</small></strong></div><div><span>Convenio</span><strong className={s.agreementValue}>Vinculado <Icon name="check" size={15} /></strong></div></div>
          <div className={s.tableHead}><span>CONCEPTO</span><span>IMPORTE</span><span>ESTADO</span></div>
          <div className={s.accountRow}><span>Hospitalización</span><strong>$18,000.00</strong><span><i className={s.greenDot} /> Revisado</span></div>
          <div className={s.accountRow}><span>Procedimientos</span><strong>$24,000.00</strong><span><i className={s.violetDot} /> Revisar</span></div>
          <div className={s.accountRow}><span>Insumos y materiales</span><strong>$6,600.00</strong><span><i className={s.greenDot} /> Revisado</span></div>
          <div className={s.windowFoot}><Icon name="link" size={15} /><span>Conceptos, reglas y revisión en el mismo espacio.</span><span>Datos ficticios</span></div>
        </div>
      </section>

      <section id="equipos" className={s.roles} aria-labelledby="roles-title" data-reveal>
        <div className={s.rolesHeading}><div><p className={s.kicker}>03 / Equipos</p><h2 id="roles-title">Un sistema. Distintas miradas.</h2></div><p>La información adecuada para cada función.</p></div>
        <div className={s.roleList}>{roles.map((role, index) => <Link key={role.name} href={role.href} className={s.roleRow}><span className={s.roleIndex}>0{index + 1}</span><span className={s.roleIcon}><Icon name={role.icon} size={19} /></span><strong>{role.name}</strong><span className={s.roleDescription}>{role.description}</span><Icon name="arrowUp" size={17} /></Link>)}</div>
      </section>

      <section className={s.license} aria-labelledby="license-title" data-reveal>
        <div><p className={s.kicker}>04 / Contratación</p><h2 id="license-title">Una licencia a la medida de tu operación.</h2></div>
        <p>Hospitales, usuarios, capacidad y vigencia se definen en una propuesta para tu organización.</p>
        <a href="#contacto" className={s.licenseLink}>Hablemos <Icon name="arrow" size={17} /></a>
      </section>

      <section id="contacto" className={s.contact} aria-labelledby="contact-title">
        <div className={s.contactIntro} data-reveal><p className={s.kicker}>Conversemos</p><h2 id="contact-title">El siguiente paso<br />empieza aquí.</h2><p>Cuéntanos qué necesita tu hospital.</p><span className={s.contactLine} aria-hidden="true" /></div>
        <div className={s.formShell} data-reveal>
          {submitted ? <div className={s.success} role="status"><span className={s.successIcon}><Icon name="check" size={24} /></span><h3>Solicitud registrada.</h3><p>Gracias por compartir el contexto de tu organización.</p><small>Esta demostración no envía correos automáticos.</small><Button variant="secondary" onClick={() => setSubmitted(false)}>Registrar otra solicitud</Button></div> : <form onSubmit={submit}><div className={s.formHeading}><h3>Solicitar información</h3><span>01 — 04</span></div><div className={s.formGrid}><Field label="Nombre completo" required><input name="name" autoComplete="name" placeholder="Tu nombre" required maxLength={120} /></Field><Field label="Correo de trabajo" required><input name="email" type="email" autoComplete="email" placeholder="nombre@hospital.mx" required maxLength={180} /></Field></div><Field label="Hospital u organización" required><input name="organization" autoComplete="organization" placeholder="Nombre de la organización" required maxLength={180} /></Field><Field label="¿Qué te gustaría resolver?" required><textarea name="message" placeholder="Cuéntanos brevemente…" required rows={3} maxLength={2000} /></Field><label className={s.consent}><input type="checkbox" name="consent" required /><span>Autorizo el uso de estos datos para atender mi solicitud. <Link href="/privacidad">Aviso de privacidad.</Link></span></label>{error && <p role="alert" className={s.error}>{error}</p>}<Button type="submit" loading={submitting} className={s.submitButton}>Enviar solicitud <Icon name="arrow" size={17} /></Button></form>}
        </div>
      </section>
    </main>

    <footer className={s.footer}><div className={s.footerTop}><Brand /><span>Preauditoría hospitalaria con claridad.</span></div><nav aria-label="Enlaces del pie"><Link href="/login">Hospital</Link><Link href="/admin/login">Consola Atlas</Link><Link href="/insurer/login">Aseguradora demo</Link><Link href="/privacidad">Privacidad</Link></nav><div className={s.footerBottom}><span>© 2026 Atlas Link</span><span>Demostración con datos sintéticos.</span><a href="#contenido">Volver arriba <Icon name="arrowUp" size={14} /></a></div></footer>
  </div>;
}
