'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, type IconName } from './ui';
import s from './system-showcase.module.css';

const spaces: { id: string; name: string; audience: string; subtitle: string; image: string; alt: string; icon: IconName; href: string; entry: string; modules: string[]; note: string }[] = [
  { id: 'hospital', name: 'Portal hospitalario', audience: 'Para el equipo del hospital', subtitle: 'Cada cuenta encuentra su siguiente paso.', image: '/images/clinical-team.jpg', alt: 'Equipo y recepción hospitalaria; fotografía ilustrativa.', icon: 'building', href: '/login', entry: 'Entrar al portal hospitalario', modules: ['Cuentas y convenios', 'Preauditoría y revisión', 'Reportes y trazabilidad'], note: 'Accesos según la función de cada persona.' },
  { id: 'control', name: 'Consola Atlas', audience: 'Para administrar el producto', subtitle: 'Tu red, tus licencias, tu perspectiva.', image: '/images/hospital-facade.jpg', alt: 'Fachada de arquitectura hospitalaria blanca; fotografía ilustrativa.', icon: 'layers', href: '/admin/login', entry: 'Entrar a la consola Atlas', modules: ['Hospitales y organizaciones', 'Licencias y capacidad', 'Solicitudes, usuarios y actividad'], note: 'El espacio de gestión de la empresa proveedora.' },
  { id: 'insurer', name: 'Aseguradora demo', audience: 'Una perspectiva de consulta', subtitle: 'El contexto de la cuenta, a la vista.', image: '/images/hospital.jpg', alt: 'Interior de un hospital; fotografía ilustrativa.', icon: 'shield', href: '/insurer/login', entry: 'Entrar a la aseguradora demo', modules: ['Panorama de cuentas', 'Consulta de conceptos', 'Detalle de preauditoría'], note: 'Solo lectura. Datos ficticios del hospital demo.' },
];

function SpaceCard({ space, index }: { space: typeof spaces[number]; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  return <article className={s.card} data-space={space.id} data-flipped={flipped} data-reveal role="group" aria-roledescription="diapositiva" aria-label={`${index + 1} de ${spaces.length}: ${space.name}`}>
    <div className={s.turntable}>
      <div className={s.front} aria-hidden={flipped} inert={flipped}>
        <div className={s.picture}>
          <Image src={space.image} alt={space.alt} fill sizes="(max-width: 760px) 90vw, 600px"/>
          <span className={s.edition}>ATLAS LINK / 0{index + 1}</span>
          <span className={s.emblem} aria-hidden="true"><i/><i/><i/><b><Icon name={space.icon} size={27}/></b></span>
        </div>
        <div className={s.copy}><span>{space.audience}</span><h3>{space.name}</h3><p>{space.subtitle}</p></div>
      </div>
      <div className={s.back} id={id} aria-hidden={!flipped} inert={!flipped}>
        <span className={s.backIcon}><Icon name={space.icon} size={25}/></span>
        <p className={s.backKicker}>DENTRO DE TU ESPACIO</p><h3>{space.name}</h3>
        <ul>{space.modules.map((module, i) => <li key={module}><span>0{i + 1}</span>{module}<Icon name="check" size={15}/></li>)}</ul>
        <p className={s.note}>{space.note}</p>
      </div>
    </div>
    <footer className={s.cardFooter}>
      <button type="button" aria-expanded={flipped} aria-controls={id} aria-label={`${flipped ? 'Volver a portada de' : 'Ver módulos de'} ${space.name}`} onClick={() => setFlipped(value => !value)}><Icon name="layers" size={15}/>{flipped ? 'Ver portada' : 'Explorar módulos'}</button>
      <Link href={space.href} aria-label={space.entry}>Entrar <Icon name="arrowUp" size={17}/></Link>
    </footer>
  </article>;
}

export function SystemShowcase() {
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ start: true, end: false });
  const hint = useId();

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    function measure() {
      if (!element) return;
      const next = { start: element.scrollLeft < 4, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4 };
      setPosition(previous => previous.start === next.start && previous.end === next.end ? previous : next);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener('scroll', measure); };
  }, []);

  function move(direction: number) {
    const element = track.current;
    if (!element) return;
    const card = element.querySelector('article');
    const step = (card?.getBoundingClientRect().width || element.clientWidth) + 24;
    element.scrollBy({ left: direction * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
  }

  return <section id="espacios" className={s.section} role="region" aria-roledescription="carrusel" aria-label="Sistemas Atlas Link" data-system-showcase>
    <div className={s.heading} data-reveal><div><p className={s.kicker}>UN ECOSISTEMA. TU PROPIA PERSPECTIVA.</p><h2>Encuentra tu espacio<span>.</span></h2></div><div className={s.controls}><button type="button" onClick={() => move(-1)} disabled={position.start} aria-label="Anterior sistema"><Icon name="arrow" size={18} className={s.previous}/></button><button type="button" onClick={() => move(1)} disabled={position.end} aria-label="Siguiente sistema"><Icon name="arrow" size={18}/></button></div></div>
    <p id={hint} className="sr-only">Tres espacios. Desliza las tarjetas o usa las flechas izquierda y derecha. Explorar módulos gira cada tarjeta.</p>
    <div className={s.track} ref={track} data-showcase-track tabIndex={0} onKeyDown={keyboard} role="group" aria-label="Catálogo de espacios" aria-describedby={hint}>{spaces.map((space, index) => <SpaceCard key={space.id} space={space} index={index}/>)}</div>
    <p className={s.footnote}><span>01 — 03</span> Una identidad para cada equipo. Un recorrido conectado.</p>
  </section>;
}
