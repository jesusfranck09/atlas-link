'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { post } from '@/lib/api';
import { Brand, Button, Field, Icon, type IconName } from './ui';
import { AnalyticsSculpture } from './analytics-sculpture';
import { Daylight, useDaylightPhase } from './daylight';
import { SystemShowcase } from './system-showcase';
import { PrismaticText } from './prismatic-text';
import { useScrollReveal } from './use-scroll-reveal';
import s from './landing.module.css';

const demoValues = [
  { label: 'Preparadas', value: 12, color: '#7358ca' },
  { label: 'En revisión', value: 5, color: '#a895e1' },
  { label: 'Por resolver', value: 3, color: '#d4c9ef' },
];
const perspectives: { name: string; icon: IconName; title: string; description: string; task: string; note: string }[] = [
  { name: 'Caja', icon: 'accounts', title: 'Un buen comienzo cambia todo.', description: 'Carga la cuenta, reúne sus conceptos y empieza con información ordenada.', task: 'Recibir la cuenta', note: 'Importación desde Excel o captura manual' },
  { name: 'Auditoría', icon: 'shield', title: 'El contexto detrás de cada cifra.', description: 'Contrasta cargos con convenios y revisa los hallazgos con el criterio de tu equipo.', task: 'Revisar los hallazgos', note: 'Cada ajuste conserva su motivo y responsable' },
  { name: 'Dirección', icon: 'chart', title: 'Del movimiento a la perspectiva.', description: 'Conoce el estado de las cuentas y encuentra los puntos que necesitan atención.', task: 'Entender la operación', note: 'Indicadores y trazabilidad del trabajo compartido' },
];
const faq = [
  ['¿Qué problema resuelve Atlas Link?', 'Ordena la preauditoría de cuentas hospitalarias: recibe cargos, los contrasta con convenios, muestra hallazgos y conserva la revisión del equipo antes del envío a la aseguradora.'],
  ['¿Sustituye nuestro sistema hospitalario?', 'Atlas Link complementa tu operación. Puedes comenzar con una plantilla Excel o captura manual; las integraciones con otros sistemas se acuerdan durante la implementación.'],
  ['¿Cómo funciona la licencia?', 'La licencia considera hospitales, usuarios, volumen mensual y vigencia. La propuesta se define con tu organización y puedes explorar primero los distintos perfiles de la demostración.'],
  ['¿Una cuenta revisada ya está autorizada?', 'La preauditoría prepara y documenta la revisión. La autorización y el pago corresponden a la aseguradora. Tu equipo conserva la decisión sobre los ajustes.'],
];

export default function Landing() {
  const site = useRef<HTMLDivElement>(null);
  useScrollReveal(site);
  const daylight = useDaylightPhase();
  const [menu, setMenu] = useState(false);
  const [role, setRole] = useState(1);
  const [network, setNetwork] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const active = perspectives[role];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      await post('/leads', { name: data.get('name'), email: data.get('email'), organization: data.get('organization'), message: data.get('message'), consent: data.get('consent') === 'on' });
      setSubmitted(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar tu solicitud. Inténtalo de nuevo.'); }
    finally { setSubmitting(false); }
  }
  return <div ref={site} className={s.site} data-time-of-day={daylight ?? undefined}>
    <Daylight phase={daylight} surface="landing"/>
    <a href="#contenido" className="skip-link">Ir al contenido</a>
    <header className={s.header}><div className={s.headerInner}>
      <Brand/>
      <nav id="public-menu" className={`${s.nav} ${menu ? s.navOpen : ''}`} aria-label="Navegación principal">
        <a href="#plataforma" onClick={() => setMenu(false)}>Plataforma</a><a href="#equipos" onClick={() => setMenu(false)}>Para tu equipo</a><a href="#licencias" onClick={() => setMenu(false)}>Licencias</a>
      </nav>
      <div className={s.headerActions}><Link href="/login" className={s.loginLink}>Iniciar sesión</Link><a href="#contacto" className={s.headerCta}>Conoce Atlas <Icon name="arrow" size={16}/></a><button className={s.menuButton} onClick={() => setMenu(!menu)} aria-label={menu ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={menu} aria-controls="public-menu"><Icon name={menu ? 'close' : 'menu'}/></button></div>
    </div></header>
    <main id="contenido">
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroIntro} data-hero-intro>
          <div className={s.heroLead}>
            <p className={s.heroEyebrow} data-hero-eyebrow>Preauditoría hospitalaria</p>
            <h1 id="hero-title">Cada cuenta,<br/><span><PrismaticText>en perspectiva.</PrismaticText></span></h1>
          </div>
          <div className={s.heroAside}>
            <p>Reúne cuentas, convenios y hallazgos en un mismo espacio.</p>
            <div className={s.heroActions}><Link href="/login" className={s.primary}>Explorar plataforma <Icon name="arrow" size={17}/></Link><a href="#contacto" className={s.secondary}>Contactar <Icon name="arrowUp" size={17}/></a></div>
          </div>
        </div>
        <div className={s.heroVisual}>
          <div className={s.heroPhoto}><Image src="/images/hospital-architecture.jpg" alt="Arquitectura hospitalaria con lucernarios circulares y luz natural" fill priority sizes="(max-width: 760px) 100vw, 75vw"/><div className={s.photoShade}/><span className={s.photoTag}><i/> Tecnología al servicio de tu equipo</span><div className={s.photoCaption}><span>UNA OPERACIÓN MÁS CONECTADA</span><h2>El cuidado está<br/>en cada detalle.</h2><div className={s.photoCaptionLine}/><p>Del primer registro<br/>al siguiente paso.</p></div></div>
          <div className={s.heroAnalytics}><div className={s.analyticsTop}><span className={s.appIcon}><Icon name="chart" size={19}/></span><div><strong>Todo, en perspectiva.</strong><span>Panorama de preauditoría</span></div><span className={s.liveTag}><i/> Demo</span></div><div className={s.analyticsFigure}><div><span>Cuentas en operación</span><strong>20<span>cuentas</span></strong></div><span className={s.analyticsSmall}>Un mismo espacio.<br/>Un siguiente paso claro.</span></div><AnalyticsSculpture values={demoValues} variant="ring" finish="glass" compact minimal caption="Distribución ilustrativa de cuentas"/><div className={s.analyticsFooter}><span>Ejemplo interactivo · Datos ficticios</span><Link href="/login" aria-label="Abrir demostración de la plataforma"><Icon name="arrowUp" size={19}/></Link></div></div>
        </div>
        <div className={s.underHero}><span>DISEÑADO PARA TU OPERACIÓN</span><div><Icon name="building" size={18}/> Hospitales</div><div><Icon name="globe" size={18}/> Redes hospitalarias</div><div><Icon name="users" size={18}/> Equipos de auditoría</div><a href="#plataforma" aria-label="Descubrir Atlas Link"><Icon name="down" size={18}/></a></div>
      </section>

      <section id="plataforma" className={s.productSection} aria-labelledby="product-title">
        <div className={s.sectionTitle} data-reveal><p className={s.kicker}>EL DETALLE. LA VISIÓN COMPLETA.</p><h2 id="product-title">Menos piezas sueltas.<br/><span><PrismaticText>Más claridad para avanzar.</PrismaticText></span></h2><p>Cada cuenta tiene una historia. Atlas Link conecta sus datos,<br className={s.desktopBreak}/> las reglas del convenio y las decisiones de tu equipo.</p></div>
        <div className={s.bento}>
          <article className={s.accountCard} data-reveal><div className={s.featureIntro}><span className={s.featureIcon}><Icon name="layers" size={22}/></span><h3>Un espacio. Todo el contexto.</h3><p>Cargos, coberturas y hallazgos juntos.<br/>La información que necesitas, donde la necesitas.</p></div><div className={s.accountSheet}><div className={s.sheetTop}><span><Icon name="accounts" size={18}/> Cuenta hospitalaria</span><span>DEMO</span></div><div className={s.sheetIdentity}><div><small>REFERENCIA</small><strong>HSP–0284</strong></div><span className={s.sheetStatus}><i/> En revisión</span></div><div className={s.sheetAmount}><span>Importe recibido</span><strong>$48,600<span>.00</span></strong><small>MXN · Cuenta ilustrativa</small></div><div className={s.sheetRows}><div><span>Hospitalización</span><strong>$18,000.00</strong></div><div><span>Procedimientos</span><strong>$24,000.00</strong></div><div><span>Insumos y materiales</span><strong>$6,600.00</strong></div></div><div className={s.sheetFoot}><Icon name="link" size={16}/><span>Convenio vinculado</span><Icon name="check" size={15}/></div></div></article>
          <article className={s.rulesCard} data-reveal><div className={s.featureIntro}><span className={s.featureIcon}><Icon name="shield" size={22}/></span><h3>El criterio se puede explicar.</h3><p>Contrasta cada concepto con su convenio.<br/>Encuentra el origen de cada cálculo.</p></div><div className={s.ruleFlow}><div className={s.ruleNode}><Icon name="file" size={21}/><span>Cuenta recibida</span><Icon name="check" size={16}/></div><span className={s.flowConnector}/><div className={`${s.ruleNode} ${s.ruleNodeMain}`}><span className={s.ruleLogo}>a.</span><div><strong>Atlas Link</strong><span>Conceptos + reglas + contexto</span></div><Icon name="spark" size={20}/></div><span className={s.flowConnector}/><div className={s.ruleResult}><span><Icon name="check" size={15}/> Convenio aplicado</span><span><Icon name="review" size={15}/> Revisión humana</span></div></div><p className={s.cardNote}>Versiones y decisiones que dejan huella.</p></article>
          <article className={s.traceCard} data-reveal><div><span className={s.featureIcon}><Icon name="clock" size={22}/></span><h3>El siguiente paso,<br/>siempre visible.</h3><p>Responsables claros y un historial compartido para seguir cada decisión.</p><Link href="/login">Recorrer una cuenta <Icon name="arrow" size={18}/></Link></div><div className={s.timeline}><div><i/><span>Cuenta recibida<small>Información completa</small></span><Icon name="check" size={16}/></div><div><i/><span>Preauditoría realizada<small>Hallazgos identificados</small></span><Icon name="check" size={16}/></div><div><i/><span>Revisión del equipo<small>El criterio sigue siendo humano</small></span><span className={s.timelineCurrent}>Ahora</span></div></div></article>
        </div>
      </section>

      <section id="equipos" data-reveal className={s.teamSection} aria-labelledby="team-title"><div className={s.teamPhoto}><Image src="/images/healthcare-editorial.jpg" alt="Profesionales sanitarios colaboran en un entorno hospitalario" fill sizes="(max-width: 760px) 100vw, 50vw"/><div className={s.teamPhotoCaption}><Icon name="heart" size={24}/><span>Personas conectadas.<br/><strong>Decisiones con contexto.</strong></span></div></div><div className={s.teamCopy}><p className={s.kicker}>UNA PLATAFORMA. MUCHAS PERSPECTIVAS.</p><h2 id="team-title">Cada persona importa.<br/><span>Cada función, también.</span></h2><div className={s.roleTabs} aria-label="Explorar por función">{perspectives.map((item, index) => <button type="button" key={item.name} aria-pressed={role === index} className={role === index ? s.roleActive : ''} onClick={() => setRole(index)}><Icon name={item.icon} size={17}/>{item.name}</button>)}</div><div className={s.roleContent} aria-live="polite"><h3>{active.title}</h3><p>{active.description}</p><div className={s.roleTask}><span><Icon name={active.icon} size={23}/></span><div><strong>{active.task}</strong><small>{active.note}</small></div><Icon name="arrow" size={18}/></div></div><a href="#espacios" className={s.textLink}>Encuentra tu espacio <Icon name="arrowUp" size={18}/></a></div></section>

      <SystemShowcase/>

      <section id="licencias" className={s.licenseSection}><div className={s.licenseCopy} data-reveal><p className={s.kicker}>PREPARADO PARA TU SIGUIENTE ETAPA</p><h2>Un hospital.<br/>Una red.<br/><span>Tu propia escala.</span></h2><p>Licencias que parten de tu operación.<br/>Capacidad, usuarios y acompañamiento definidos contigo.</p><div className={s.licenseToggle} aria-label="Tipo de organización"><button type="button" aria-pressed={!network} onClick={() => setNetwork(false)}>Un hospital</button><button type="button" aria-pressed={network} onClick={() => setNetwork(true)}>Una red hospitalaria</button></div></div><article className={s.licenseCard} data-reveal><div className={s.licenseCardHead}><span className={s.licenseGlyph}><Icon name={network ? 'globe' : 'building'} size={31}/></span><span>ATLAS LINK<br/><strong>{network ? 'Hospital Network' : 'Hospital'}</strong></span><span className={s.customTag}>A tu medida</span></div><h3>{network ? 'Conecta cada unidad.' : 'El espacio de tu equipo.'}</h3><p>{network ? 'Cada hospital con su información, accesos, convenios y capacidad contratada.' : 'Todo el recorrido de preauditoría en una licencia para tu hospital.'}</p><ul>{(network ? ['Espacios independientes por hospital', 'Configuración de cada organización', 'Licencias y vigencias por unidad', 'Alcance de implementación acordado'] : ['Cuentas, convenios y hallazgos conectados', 'Perfiles para cada función del equipo', 'Capacidad mensual acordada', 'Acompañamiento en la puesta en marcha']).map(item => <li key={item}><Icon name="check" size={17}/>{item}</li>)}</ul><a href="#contacto" className={s.primary}>Conversemos sobre tu plan <Icon name="arrow" size={17}/></a><small>Propuesta personalizada · MXN</small></article></section>

      <section className={s.faqSection} data-reveal><div><p className={s.kicker}>ANTES DE EMPEZAR</p><h2>Buenas preguntas.<br/><span>Respuestas claras.</span></h2></div><div className={s.faqList}>{faq.map(([question, answer]) => <details key={question}><summary>{question}<Icon name="plus" size={18}/></summary><p>{answer}</p></details>)}</div></section>

      <section id="contacto" className={s.contactSection}><div className={s.contactCopy}><p className={s.kicker}>LA SIGUIENTE CONEXIÓN ES CONTIGO</p><h2>Hagamos espacio<br/>para algo mejor.</h2><p>Cuéntanos cómo trabaja tu hospital.<br/>El siguiente paso lo construimos juntos.</p><div className={s.contactOrbit} aria-hidden="true"><span/><span/><span/><b>a.</b></div></div><div className={s.contactForm}>{submitted ? <div role="status" className={s.success}><span><Icon name="check" size={28}/></span><h3>La conversación<br/>ya tiene un comienzo.</h3><p>Tu solicitud quedó registrada. Gracias por compartir el contexto de tu hospital.</p><small>En esta demostración no se envían correos automáticos.</small><Button variant="secondary" onClick={() => setSubmitted(false)}>Registrar otra solicitud</Button></div> : <form onSubmit={submit}><h3>Hablemos de tu hospital.</h3><p>Déjanos los datos para conocer tu operación.</p><div className={s.formGrid}><Field label="Nombre completo" required><input name="name" autoComplete="name" placeholder="Tu nombre" required maxLength={120}/></Field><Field label="Correo de trabajo" required><input name="email" type="email" autoComplete="email" placeholder="nombre@hospital.mx" required maxLength={180}/></Field></div><Field label="Hospital u organización" required><input name="organization" autoComplete="organization" placeholder="Nombre de la organización" required maxLength={180}/></Field><Field label="¿Qué te gustaría resolver?" required><textarea name="message" placeholder="Cuéntanos sobre tu operación…" required rows={3} maxLength={2000}/></Field><label className={s.consent}><input type="checkbox" name="consent" required/><span>Autorizo el uso de estos datos para atender mi solicitud. <Link href="/privacidad">Aviso de privacidad.</Link></span></label>{error && <p role="alert" className="form-error">{error}</p>}<Button loading={submitting} type="submit" className={s.sendButton}>Iniciar la conversación <Icon name="arrow" size={18}/></Button></form>}</div></section>
    </main>
    <footer className={s.footer}><div><Brand/><p>La claridad que conecta.</p></div><nav aria-label="Enlaces del pie"><a href="#plataforma">Plataforma</a><Link href="/login">Portal hospitalario</Link><Link href="/admin/login">Consola Atlas <Icon name="arrowUp" size={14}/></Link><Link href="/insurer/login">Aseguradora demo</Link><Link href="/privacidad">Privacidad</Link></nav><div className={s.footerBottom}><span>© 2026 Atlas Link</span><span>Diseñado alrededor de las personas.</span><a href="#contenido">Volver arriba <Icon name="arrowUp" size={14}/></a></div></footer>
  </div>;
}
