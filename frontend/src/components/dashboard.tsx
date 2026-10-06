'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useResource } from '@/lib/api';
import { comparisonPalette, lanePalette } from '@/lib/chart-palette';
import { actionText, compactMoney, date, initials, number } from '@/lib/format';
import type { Dashboard as DashboardData, License, Tenant } from '@/lib/types';
import { useUser } from './auth';
import AccountsTable from './accounts-table';
import { AnalyticsSculpture } from './analytics-sculpture';
import { SystemSculpture } from './system-sculpture';
import { Button, EmptyState, ErrorState, Icon, Loading } from './ui';
import s from './portal.module.css';

const lanes = [
  { key: 'GREEN', label: 'Sin alertas', color: lanePalette.GREEN },
  { key: 'YELLOW', label: 'Revisión requerida', color: lanePalette.YELLOW },
  { key: 'RED', label: 'Atención prioritaria', color: lanePalette.RED },
] as const;
const licenseStatus: Record<License['status'], string> = { TRIAL: 'En prueba', ACTIVE: 'Activa', SUSPENDED: 'Suspendida', EXPIRED: 'Vencida' };

export function Metric({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return <div className={s.metric}><div className={s.metricLabel}>{label}</div><div className={s.metricValue}><strong>{value}</strong>{caption && <span>{caption}</span>}</div></div>;
}

export function MonthlyChart({ data }: { data: DashboardData['monthly'] }) {
  const periods = [...data].sort((a, b) => a.label.localeCompare(b.label));
  if (!periods.length) return <EmptyState title="Sin historial mensual" description="Aparecerá cuando recibas cuentas."/>;
  const total = periods.reduce((sum, period) => sum + Number(period.total), 0);
  return <div className={s.monthlyChart}><div className={s.chartSummary}><strong>{compactMoney(total)}</strong><span>Importe recibido · MXN</span></div><AnalyticsSculpture values={periods.map(period => ({ label: period.label, value: Number(period.total), color: comparisonPalette[0] }))} variant="bars" density="compact" finish="glass" minimal caption="Importe facturado por periodo, en pesos mexicanos"/>{periods.length === 1 && <p className={s.chartNote}>Un periodo disponible.</p>}</div>;
}

function PlatformPortfolio() {
  const tenants = useResource<Tenant[]>('/tenants');
  const licenses = useResource<License[]>('/licenses');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'pie' | 'bars'>('pie');
  const knownUsage = (licenses.data || []).filter(license => license.usedAccounts !== null);
  const unavailable = (licenses.data || []).length - knownUsage.length;
  const usageTotal = knownUsage.reduce((sum, license) => sum + (license.usedAccounts ?? 0), 0);
  const capacity = knownUsage.reduce((sum, license) => sum + license.monthlyAccountLimit, 0);
  const utilization = capacity > 0 ? Math.round(usageTotal / capacity * 100) : null;
  const filtered = (tenants.data || []).filter(tenant => `${tenant.name} ${tenant.slug}`.toLowerCase().includes(query.trim().toLowerCase()));
  const reload = () => { tenants.reload(); licenses.reload(); };
  if (tenants.loading || licenses.loading) return <Loading label="Consultando organizaciones y capacidad"/>;
  if (tenants.error || licenses.error) return <ErrorState message={tenants.error || licenses.error || 'No se pudo consultar el uso.'} retry={reload}/>;
  return <>
    <div className={s.workGrid}>
      <section className={`${s.panel} ${s.workPanel}`}>
        <div className={s.panelHead}><h2>Hospitales</h2><div className={s.panelTools}><Link href="/admin/tenants" className="text-link">Ver todos <Icon name="arrow" size={15}/></Link><button type="button" className="icon-button" onClick={reload} aria-label="Actualizar uso" title="Actualizar uso"><Icon name="refresh" size={15}/></button></div></div>
        <div className={s.listToolbar}><label className={s.localSearch}><Icon name="search" size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar hospital" aria-label="Buscar en hospitales conectados"/></label><span>{filtered.length} de {tenants.data?.length || 0} hospitales</span></div>
        {filtered.length ? <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Capacidad por hospital"><table className={s.portfolioTable}><thead><tr><th scope="col">Hospital</th><th scope="col">Licencia</th><th scope="col">Uso mensual</th><th scope="col">Equipo</th><th scope="col">Vigencia</th></tr></thead><tbody>{filtered.map(tenant => {
          const license = licenses.data?.find(item => item.tenantId === tenant.id);
          const usage = license && license.usedAccounts !== null && license.monthlyAccountLimit > 0 ? Math.min(100, license.usedAccounts / license.monthlyAccountLimit * 100) : null;
          return <tr key={tenant.id}><td><Link className={s.portfolioTenant} href="/admin/tenants"><span>{initials(tenant.name)}</span><div><strong>{tenant.name}</strong><small>{tenant.slug}</small></div></Link></td><td>{license ? <><span className={`badge ${license.status === 'ACTIVE' ? 'badge-green' : license.status === 'TRIAL' ? 'badge-blue' : 'badge-neutral'}`}>{licenseStatus[license.status]}</span><small className={s.portfolioMeta}>{license.plan}</small></> : 'Sin licencia'}</td><td>{license ? <div className={s.portfolioUsage}><span><strong>{license.usedAccounts === null ? '—' : number(license.usedAccounts)}</strong> / {number(license.monthlyAccountLimit)}</span>{usage !== null && <div><span style={{ width: `${usage}%` }}/></div>}</div> : '—'}</td><td>{tenant.userCount === null ? '—' : number(tenant.userCount)}</td><td>{license ? date(license.expiresAt) : '—'}</td></tr>;
        })}</tbody></table></div> : <EmptyState title={query ? 'No hay hospitales con ese nombre' : 'Aún no hay hospitales conectados'} description={query ? 'Prueba con otro nombre o identificador.' : 'Registra el primer hospital para conectar su operación.'}/>}
        <div className={s.tableFoot}><span>Uso registrado: <strong>{knownUsage.length ? number(usageTotal) : '—'}</strong> de {knownUsage.length ? number(capacity) : '—'} cuentas · {utilization === null ? 'Sin lectura de capacidad' : `${utilization}% utilizado`}</span><Link href="/admin/licenses">Gestionar licencias <Icon name="arrow" size={15}/></Link></div>
        <div className={s.inlineActions}><Link href="/admin/leads"><Icon name="mail" size={16}/> Solicitudes comerciales</Link></div>
      </section>
      <aside className={`${s.panel} ${s.analyticsPanel}`}><div className={s.panelHead}><h2>Uso mensual</h2></div><div className={s.chartToolbar}><span><strong>{knownUsage.length ? number(usageTotal) : '—'}</strong> cuentas</span><div className={s.chartToggle} aria-label="Representación de la actividad"><button aria-pressed={view === 'pie'} onClick={() => setView('pie')}>Distribución</button><button aria-pressed={view === 'bars'} onClick={() => setView('bars')}>Comparar</button></div></div><div className={s.chartBody}>{knownUsage.length ? <AnalyticsSculpture values={knownUsage.map((license, index) => ({ label: license.tenantName, value: license.usedAccounts ?? 0, color: comparisonPalette[index % comparisonPalette.length] }))} variant={view} density="compact" finish="glass" minimal caption="Distribución del uso mensual registrado por hospital"/> : <EmptyState title="Sin lecturas de uso" description="Se mostrarán cuando estén disponibles."/>}</div>{unavailable > 0 && <p className={s.chartNote}>{unavailable} hospitales sin lectura, fuera de la gráfica.</p>}</aside>
    </div>
  </>;
}

type RecentFilter = 'all' | 'findings' | 'ready';
function HospitalOverview({ data, canReview }: { data: DashboardData; canReview: boolean }) {
  const [view, setView] = useState<'distribution' | 'volume'>('distribution');
  const [filter, setFilter] = useState<RecentFilter>('all');
  const recent = data.recentAccounts.slice(0, 6);
  const filtered = recent.filter(account => filter === 'all' || (filter === 'findings' ? account.anomalyCount > 0 : account.status === 'READY'));
  const counts = { all: recent.length, findings: recent.filter(account => account.anomalyCount > 0).length, ready: recent.filter(account => account.status === 'READY').length };
  return <div className={s.workGrid}>
    <section className={`${s.panel} ${s.workPanel}`}>
      <div className={s.panelHead}><h2>Cuentas recientes</h2><Link href="/hospital/accounts" className="text-link">Ver todas <Icon name="arrow" size={15}/></Link></div>
      <div className={s.listToolbar}><div className={s.recentFilters} role="group" aria-label="Filtrar cuentas recientes">{([['all', 'Todas'], ['findings', 'Con hallazgos'], ['ready', 'Listas para envío']] as const).map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{counts[key]}</span></button>)}</div></div>
      {filtered.length ? <AccountsTable accounts={filtered} compact/> : <div className={s.recentEmpty}><Icon name="accounts" size={23}/><strong>No hay cuentas recientes en esta categoría</strong><p>Este filtro solo considera las últimas {recent.length} cuentas recibidas.</p><button onClick={() => setFilter('all')}>Ver todas las recientes</button></div>}
      <div className={s.tableFoot}><span>{filtered.length} de {recent.length} recientes</span><Link href={canReview ? '/hospital/review' : '/hospital/accounts?lane=YELLOW'}>{canReview ? 'Revisar cuentas' : 'Ver en revisión'}<Icon name="arrow" size={15}/></Link></div>

    </section>
    <aside className={`${s.panel} ${s.analyticsPanel}`}><div className={s.panelHead}><h2>{view === 'distribution' ? 'Preauditoría' : 'Volumen recibido'}</h2><div className={s.chartToggle} role="group" aria-label="Vista del análisis"><button aria-pressed={view === 'distribution'} onClick={() => setView('distribution')}>Distribución</button><button aria-pressed={view === 'volume'} onClick={() => setView('volume')}>Volumen</button></div></div>{view === 'distribution' ? <div className={s.chartBody}><AnalyticsSculpture values={lanes.map(lane => ({ label: lane.label, value: data.byLane[lane.key] || 0, color: lane.color }))} variant="pie" density="compact" finish="glass" minimal caption="Distribución de cuentas según el resultado de preauditoría"/></div> : <MonthlyChart data={data.monthly}/>}<p className={s.chartNote}>Preauditoría acumulada. No autoriza pagos.</p></aside>
  </div>;
}

export default function Dashboard({ platform = false }: { platform?: boolean }) {
  const user = useUser();
  const system = platform ? 'control' : user.role === 'INSURER_DEMO' ? 'insurer' : 'hospital';
  const { data, error, loading, reload } = useResource<DashboardData>('/dashboard');
  const canImport = ['HOSPITAL_ADMIN', 'BILLING', 'REVIEWER'].includes(user.role);
  const canReview = ['HOSPITAL_ADMIN', 'REVIEWER'].includes(user.role);
  if (loading) return <Loading/>;
  if (error || !data) return <ErrorState message={error || 'No hay información disponible.'} retry={reload}/>;
  return <div className={s.dashboard}>
    <header className={s.systemCover} data-system-cover={system}>
      <div className={s.coverCopy}>
        <p className={s.coverEyebrow}><span/>{system === 'control' ? 'Gestión de la plataforma' : system === 'insurer' ? 'Consulta de cuentas · Demo' : `Hola, ${user.name.split(' ')[0]}`}</p>
        <h1>{system === 'control' ? <>Tu red,<br/>en perspectiva.</> : system === 'insurer' ? <>Mesa de <em>consulta.</em></> : <>Pulso del <span>hospital.</span></>}</h1>
        <div className={s.coverActions}>{platform ? <Link className="btn btn-primary" href="/admin/tenants?new=true"><Icon name="plus" size={16}/> Nuevo hospital</Link> : canImport ? <Link className="btn btn-primary" href="/hospital/import"><Icon name="plus" size={16}/> Cargar cuenta</Link> : <Link className="btn btn-primary" href="/hospital/accounts">Explorar cuentas <Icon name="arrow" size={16}/></Link>}<Button variant="secondary" onClick={reload} aria-label="Actualizar vista general"><Icon name="refresh" size={15}/><span>Actualizar</span></Button></div>
      </div>
      <div className={s.coverVisual} aria-hidden="true"><div className={s.coverOrbit}/><SystemSculpture variant={system} className={s.coverSculpture}/></div>
      <figure className={s.coverPhoto}>
        <Image src={system === 'control' ? '/images/hospital-facade.jpg' : system === 'insurer' ? '/images/hospital.jpg' : '/images/clinical-team.jpg'} alt="" fill sizes="(max-width: 760px) 0px, (max-width: 1100px) 160px, 220px"/>
        <figcaption><Icon name={platform ? 'building' : system === 'insurer' ? 'eye' : 'link'} size={14}/>{platform ? 'Red hospitalaria' : system === 'insurer' ? 'Solo lectura' : 'Operación conectada'}</figcaption>
      </figure>
    </header>
    <div className={s.metricRibbon}>{platform ? <><Metric label="Hospitales" value={number(data.activeTenants)}/><Metric label="Licencias vigentes" value={number(data.activeLicenses)}/><Metric label="Capacidad contratada" value={number(data.monthlyCapacity)} caption="cuentas / mes"/><Metric label="Solicitudes" value={number(data.leadsCount)}/></> : <><Metric label="Cuentas recibidas" value={number(data.totalAccounts)}/><Metric label="Por revisar" value={number(data.pendingReview)}/><Metric label="Listas para envío" value={number(data.readyToSend)}/><Metric label="Total facturado" value={compactMoney(data.totalBilled)} caption="MXN"/></>}</div>
    {platform ? <PlatformPortfolio/> : <HospitalOverview data={data} canReview={canReview}/>}
    <details className={s.activityPanel}><summary className={s.activityHeading}><h2>Actividad reciente</h2><Icon name="chevron" size={15}/></summary>{data.activity.length ? <ol className={s.activityList}>{data.activity.slice(0, 3).map((item, i) => <li className={s.activityItem} key={item.id || i}><Icon name={item.action.includes('EVALUAT') ? 'shield' : item.action.includes('LOGIN') ? 'key' : 'file'} size={16}/><strong>{actionText(item.action)}</strong><span>{item.actor || 'Equipo Atlas'}</span><time>{date(item.createdAt, true)}</time></li>)}</ol> : <p className={s.activityEmpty}>Sin actividad registrada.</p>}</details>
  </div>;
}
