'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AuthBoundary, logout, useUser } from './auth';
import { Brand, Button, Icon, Modal, type IconName } from './ui';
import { Daylight, DaylightSource, useDaylightPhase } from './daylight';
import { initials, roleLabel } from '@/lib/format';
import type { Role } from '@/lib/types';
import s from './portal.module.css';

type NavItem = {label: string; shortLabel?: string; href: string; icon: IconName; group: string; roles?: Role[]};
const hospitalNav: NavItem[] = [
  {label: 'Vista general', href: '/hospital', icon: 'dashboard', group: 'OPERACIÓN'},
  {label: 'Cuentas hospitalarias', shortLabel: 'Cuentas', href: '/hospital/accounts', icon: 'accounts', group: 'OPERACIÓN'},
  {label: 'Bandeja de revisión', shortLabel: 'Revisión', href: '/hospital/review', icon: 'review', group: 'OPERACIÓN', roles: ['HOSPITAL_ADMIN', 'REVIEWER']},
  {label: 'Cargar cuentas', shortLabel: 'Importar', href: '/hospital/import', icon: 'upload', group: 'OPERACIÓN', roles: ['HOSPITAL_ADMIN', 'REVIEWER', 'BILLING']},
  {label: 'Convenios', href: '/hospital/agreements', icon: 'shield', group: 'GESTIÓN', roles: ['HOSPITAL_ADMIN']},
  {label: 'Reportes', href: '/hospital/reports', icon: 'chart', group: 'GESTIÓN', roles: ['HOSPITAL_ADMIN', 'DIRECTOR']},
  {label: 'Equipo y accesos', shortLabel: 'Equipo', href: '/hospital/users', icon: 'users', group: 'GESTIÓN', roles: ['HOSPITAL_ADMIN']},
  {label: 'Bitácora de actividad', shortLabel: 'Actividad', href: '/hospital/audit', icon: 'clock', group: 'GESTIÓN', roles: ['HOSPITAL_ADMIN', 'DIRECTOR']},
];
const platformNav: NavItem[] = [
  {label: 'Vista general', href: '/admin', icon: 'dashboard', group: 'PLATAFORMA'},
  {label: 'Hospitales', href: '/admin/tenants', icon: 'building', group: 'PLATAFORMA'},
  {label: 'Licencias y capacidad', shortLabel: 'Licencias', href: '/admin/licenses', icon: 'key', group: 'PLATAFORMA'},
  {label: 'Solicitudes comerciales', shortLabel: 'Solicitudes', href: '/admin/leads', icon: 'mail', group: 'CRECIMIENTO'},
  {label: 'Equipo Atlas', href: '/admin/users', icon: 'users', group: 'GESTIÓN'},
  {label: 'Bitácora de actividad', shortLabel: 'Actividad', href: '/admin/audit', icon: 'clock', group: 'GESTIÓN'},
];
function WorkspaceInner({children, platform}: {children: ReactNode; platform: boolean}) {
  const daylight = useDaylightPhase();
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const system = platform ? 'control' : user.role === 'INSURER_DEMO' ? 'insurer' : 'hospital';
  const systemName = platform ? 'Consola Atlas' : system === 'insurer' ? 'Portal aseguradora' : 'Portal hospitalario';
  const systemIcon: IconName = platform ? 'layers' : system === 'insurer' ? 'shield' : 'building';
  const allNav = platform ? platformNav : hospitalNav;
  const nav = allNav.filter(item => !item.roles || item.roles.includes(user.role));
  const groups = [...new Set(nav.map(item => item.group))];
  const isSelected = (item: NavItem) => pathname === item.href || (item.href.split('/').length > 2 && pathname.startsWith(`${item.href}/`));
  const active = allNav.find(isSelected);
  const accountDetail = pathname.startsWith('/hospital/accounts/');
  const moduleName = accountDetail ? 'Detalle de cuenta' : active?.label || 'Mi espacio';
  const organization = platform ? 'Atlas Link' : user.tenantName || 'Mi hospital';
  useEffect(() => {
    if (!mobile) return;
    const menuTrigger = menuRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const navigation = navigationRef.current;
    navigation?.querySelector<HTMLElement>('[aria-current="page"], button')?.focus({preventScroll: true});
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobile(false); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(navigationRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') || []).filter(item => item.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!navigation?.contains(document.activeElement)) { event.preventDefault(); first?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const breakpoint = window.matchMedia('(min-width: 761px)');
    const leaveMobile = () => { if (breakpoint.matches) setMobile(false); };
    document.addEventListener('keydown', keydown);
    breakpoint.addEventListener('change', leaveMobile);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      breakpoint.removeEventListener('change', leaveMobile);
      menuTrigger?.focus();
    };
  }, [mobile]);
  async function signOut() {
    setLeaving(true);
    try { await logout(); } finally { router.replace(platform ? '/admin/login' : system === 'insurer' ? '/insurer/login' : '/login'); }
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('search') || '').trim();
    setMobile(false);
    router.push(`${platform ? '/admin/tenants' : '/hospital/accounts'}?search=${encodeURIComponent(value)}`);
  }
  const searchForm = (mobileSearch = false) => <form onSubmit={search} className={`${s.search} ${mobileSearch ? s.mobileSearch : s.desktopSearch}`}><Icon name="search" size={17}/><input name="search" aria-label={platform ? 'Buscar hospital' : 'Buscar cuenta'} placeholder={platform ? 'Buscar hospital' : 'Buscar cuenta o referencia'}/><button type="submit" aria-label="Ejecutar búsqueda"><Icon name="arrow" size={16}/></button></form>;
  const userDetails = <><span className={s.userAvatar}>{initials(user.name)}</span><div><strong>{user.name}</strong><span>{roleLabel[user.role]}</span></div><button className="icon-button" onClick={signOut} disabled={leaving} aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" size={18}/></button></>;
  return <div className={s.workspace} data-workspace data-system={system} data-time-of-day={daylight ?? undefined}>
    <Daylight phase={daylight} surface="workspace"/>
    <a href="#workspace-content" className="skip-link">Ir al contenido</a>
    <header className={s.appHeader}><div className={s.topbar}>
      <div className={s.brandGroup}><Brand small/><span className={s.brandDivider}/><div className={s.organization}><Icon name={systemIcon} size={18}/><span>{systemName}</span></div><DaylightSource phase={daylight}/></div>
      <div className={s.topbarTools}>{searchForm()}<span className={s.environment}>{system === 'insurer' ? 'Demo · Solo lectura' : 'Demo'}</span><button className={`icon-button ${s.desktopHelp}`} onClick={() => setHelp(true)} aria-label="Centro de ayuda" title="Centro de ayuda"><Icon name="help" size={19}/></button><div className={`${s.user} ${s.desktopUser}`}>{userDetails}</div><button ref={menuRef} className={`icon-button ${s.mobileButton}`} aria-label="Abrir menú" aria-expanded={mobile} aria-controls="workspace-navigation" onClick={() => setMobile(true)}><Icon name="menu"/></button></div>
    </div></header>
    {mobile && <button className={s.scrim} aria-label="Cerrar navegación" onClick={() => setMobile(false)}/>}
    <div ref={navigationRef} className={`${s.navigationBand} ${mobile ? s.navigationOpen : ''}`} id="workspace-navigation" role={mobile ? 'dialog' : undefined} aria-modal={mobile || undefined} aria-label={mobile ? 'Módulos del espacio' : undefined}>
      <div className={s.mobileNavHeader}><Brand small/><button className="icon-button" aria-label="Cerrar menú" onClick={() => setMobile(false)}><Icon name="close"/></button></div>
      <div className={s.railIdentity}><span className={s.railEmblem}><Icon name={systemIcon} size={21}/></span><span><strong>{systemName}</strong><small>Gestión del producto</small></span></div>
      <div className={s.mobileOrganization}>{systemName}<small>{organization} · {moduleName}</small></div>
      {searchForm(true)}
      <nav className={s.navigation} aria-label="Navegación del espacio">{groups.map(group => <div className={s.navGroup} key={group}><p>{group}</p>{nav.filter(item => item.group === group).map(item => <Link href={item.href} className={`${s.navLink} ${isSelected(item) ? s.navActive : ''}`} key={item.href} onClick={() => setMobile(false)} aria-label={item.label} aria-current={isSelected(item) ? 'page' : undefined}><Icon name={item.icon} size={17}/><span>{item.shortLabel || item.label}</span></Link>)}</div>)}</nav>
      {platform && <div className={s.railFoot}><Icon name="globe" size={17}/><span>Atlas Link<small>Administración del producto</small></span><Link href="/" aria-label="Abrir sitio del producto"><Icon name="arrowUp" size={18}/></Link></div>}
      <div className={s.mobileNavFooter}><button className={s.guideButton} onClick={() => {setMobile(false); setHelp(true);}}><Icon name="help" size={18}/> Centro de ayuda</button><div className={s.user}>{userDetails}</div></div>
    </div>
    <main id="workspace-content" className={s.content}>
      <div className={s.moduleContext} data-system-context>
        <nav aria-label="Ubicación actual"><ol><li className={s.contextSystem}><Icon name={systemIcon} size={14}/><Link href={platform ? '/admin' : '/hospital'}>{systemName}</Link></li><li className={s.contextOrganization}><span>{organization}</span></li>{accountDetail && <li><Link href="/hospital/accounts">Cuentas hospitalarias</Link></li>}<li><span aria-current="page">{moduleName}</span></li></ol></nav>
        <span className={s.contextStatus}><span/>{system === 'insurer' ? 'Solo lectura' : 'Entorno demo'}</span>
      </div>
      {children}
    </main>
    <footer className={s.footer}><span>{systemName} · Datos de demostración</span><span>MXN · Ciudad de México</span></footer>
    <Modal open={help} onClose={() => setHelp(false)} title="Tu espacio, paso a paso" description={roleLabel[user.role]}><div className="guide-content"><div className="notice"><Icon name="layers"/><p>{system === 'insurer' ? 'Esta vista de consulta muestra las cuentas sintéticas del hospital demo. No modifica cuentas ni representa un portal de autorización.' : 'Esta experiencia usa cuentas y convenios sintéticos. Los cambios se guardan en el entorno de demostración.'}</p></div>{platform ? <ol><li><strong>Registra un hospital.</strong><span>Crea su espacio y una licencia de prueba desde Hospitales.</span></li><li><strong>Configura su capacidad.</strong><span>Ajusta plan, vigencia, cuentas y usuarios desde Licencias.</span></li><li><strong>Da seguimiento.</strong><span>Consulta solicitudes comerciales y la bitácora de la plataforma.</span></li></ol> : system === 'insurer' ? <ol><li><strong>Explora las cuentas.</strong><span>Filtra por estado o busca una referencia del hospital demo.</span></li><li><strong>Consulta el detalle.</strong><span>Revisa importes, partidas y resultados de preauditoría.</span></li></ol> : <ol><li><strong>Recibe una cuenta.</strong><span>Importa una plantilla o captura una cuenta hospitalaria.</span></li><li><strong>Revisa los hallazgos.</strong><span>Asigna la revisión, corrige con justificación y vuelve a evaluar.</span></li><li><strong>Prepara y registra.</strong><span>Exporta la cuenta lista y registra el envío y la respuesta.</span></li></ol>}<p className="text-muted text-sm">La preauditoría es una estimación. La autorización final corresponde a la aseguradora.</p><Button className="w-full" onClick={() => setHelp(false)}>Entendido <Icon name="check" size={17}/></Button></div></Modal>
  </div>;
}
export default function Workspace({children, platform = false}: {children: ReactNode; platform?: boolean}) {return <AuthBoundary platform={platform}><WorkspaceInner platform={platform}>{children}</WorkspaceInner></AuthBoundary>;}
