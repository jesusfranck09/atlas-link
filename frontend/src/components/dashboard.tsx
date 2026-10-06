'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useResource } from '@/lib/api';
import { date, laneLabel, number } from '@/lib/format';
import type { AccountPage, Dashboard as DashboardData, License, Tenant } from '@/lib/types';
import {comparisonPalette,lanePalette} from '@/lib/chart-palette';
import { useUser } from './auth';
import AccountsTable from './accounts-table';
import {DataDistribution} from './data-distribution';
import {DetailsButton,RecordDetailModal} from './record-tools';
import { EmptyState, ErrorState, Icon, Loading } from './ui';
import s from './dashboard.module.css';

const licenseStatus: Record<License['status'], string> = { TRIAL: 'En prueba', ACTIVE: 'Activa', SUSPENDED: 'Suspendida', EXPIRED: 'Vencida' };
function PlatformPortfolio({ summary, reloadSummary }: { summary: DashboardData; reloadSummary: () => void }) {
  const tenants = useResource<Tenant[]>('/tenants');
  const licenses = useResource<License[]>('/licenses');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{tenant:Tenant;license:License|null}|null>(null);
  const usageRecords = (licenses.data || []).filter(license => license.usedAccounts !== null);
  const usage = usageRecords.reduce((sum, license) => sum + (license.usedAccounts || 0), 0);
  const capacity = usageRecords.reduce((sum, license) => sum + license.monthlyAccountLimit, 0);
  const filtered = (tenants.data || []).filter(tenant => (tenant.name + ' ' + tenant.slug).toLowerCase().includes(query.trim().toLowerCase()));
  const reload = () => { tenants.reload(); licenses.reload(); reloadSummary(); };
  if (tenants.loading || licenses.loading) return <Loading label="Consultando la red de hospitales"/>;

  if (tenants.error || licenses.error) return <ErrorState message={tenants.error || licenses.error || 'No se pudo consultar la capacidad.'} retry={reload}/>;

  return <section className={s.networkControl} aria-labelledby="network-title">
    <div className={s.networkToolbar}>
      <div className={s.networkTitle}><span className={s.networkOverline}>ATLAS · RED OPERATIVA</span><h1 id="network-title">Hospitales</h1></div>
      <div className={s.networkTools}>
        <label className={s.networkSearch}><Icon name="search" size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar hospital" aria-label="Buscar hospitales por nombre"/></label>
        <button type="button" className="icon-button" onClick={reload} aria-label="Actualizar hospitales y licencias"><Icon name="refresh" size={16}/></button>
        <Link href="/admin/tenants?new=true" className={s.networkAdd}><Icon name="plus" size={15}/> Registrar hospital</Link>
      </div>
    </div>
    <div className={s.networkReadouts} aria-label="Resumen operativo de la red">
      <span><strong>{number(summary.activeTenants)}</strong> hospitales</span>
      <span><strong>{number(summary.activeLicenses)}</strong> licencias vigentes</span>
      <span><strong>{usageRecords.length ? `${number(usage)} / ${number(capacity)}` : '—'}</strong> cuentas / capacidad mensual</span>
      <span className={s.networkResults}>{number(filtered.length)} de {number(tenants.data?.length || 0)} registros</span>
    </div>
    <div className={s.networkRegistry}>
      {filtered.length ? <div className={s.networkTableRegion} role="region" tabIndex={0} aria-label="Hospitales, licencias y capacidad">
        <table className={`data-table ${s.networkTable}`}>
          <thead><tr><th scope="col">Hospital</th><th scope="col">Licencia</th><th scope="col">Cuentas / mes</th><th scope="col">Equipo</th><th scope="col">Vigencia</th><th scope="col">Detalle</th></tr></thead>
          <tbody>{filtered.map(tenant => {
            const license = licenses.data?.find(item => item.tenantId === tenant.id) ?? null;
            const used = license?.usedAccounts ?? null;
            const limit = license?.monthlyAccountLimit || 0;
            return <tr key={tenant.id}>
              <td className={s.networkTenant}><Link href="/admin/tenants"><strong>{tenant.name}</strong></Link><small>{tenant.slug}</small></td>
              <td>{license ? <><span className={`badge ${license.status === 'ACTIVE' ? 'badge-green' : license.status === 'TRIAL' ? 'badge-yellow' : 'badge-neutral'}`}>{licenseStatus[license.status]}</span><small className={s.networkCellNote}>{license.plan}</small></> : <span className="badge badge-neutral">Sin licencia</span>}</td>
              <td className={s.networkNumber}>{used === null ? '—' : number(used)} <span>/ {limit ? number(limit) : '—'}</span></td>
              <td>{tenant.userCount === null ? '—' : number(tenant.userCount)}</td>
              <td>{license ? date(license.expiresAt) : '—'}</td>
              <td><DetailsButton label={tenant.name} onClick={() => setSelected({tenant, license})}/></td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <EmptyState title={query ? 'No hay hospitales coincidentes' : 'La red todavía está vacía'} description={query ? 'Prueba con otro nombre o identificador.' : 'Registra un hospital para comenzar.'}/>}
    </div>
    {(licenses.data || []).length > 0 && <DataDistribution title="Licencias por estado" scope={`${number(licenses.data?.length || 0)} licencias de la red operativa`} caption="Licencias agrupadas por estado en la red operativa" values={(['TRIAL','ACTIVE','SUSPENDED','EXPIRED'] as const).map((status,index)=>({label:licenseStatus[status],value:(licenses.data||[]).filter(license=>license.status===status).length,color:comparisonPalette[index%comparisonPalette.length]}))}/>}
    <RecordDetailModal open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?.tenant.name||'Detalles de organización'} description="Registro de la red operativa" fields={selected?[{label:'Identificador',value:selected.tenant.slug},{label:'Estado de organización',value:selected.tenant.status},{label:'Personas',value:selected.tenant.userCount===null?'Sin lectura':number(selected.tenant.userCount)},{label:'Cuenta creada',value:date(selected.tenant.createdAt,true)},{label:'Plan',value:selected.license?.plan||'Sin licencia'},{label:'Estado de licencia',value:selected.license?licenseStatus[selected.license.status]:'Sin licencia'},{label:'Vigencia',value:selected.license?date(selected.license.expiresAt):'—'},{label:'Cuentas usadas',value:selected.license?.usedAccounts===null||selected.license?.usedAccounts===undefined?'Sin lectura':number(selected.license.usedAccounts)},{label:'Capacidad mensual',value:selected.license?number(selected.license.monthlyAccountLimit):'—'}]:[]}/>
  </section>;
}

type RecentFilter = 'all' | 'findings' | 'ready';

function AccountQueue({ data, insurer = false, canImport = false, canReview = false }: { data: DashboardData; insurer?: boolean; canImport?: boolean; canReview?: boolean }) {
  const [filter, setFilter] = useState<RecentFilter | 'GREEN' | 'YELLOW' | 'RED'>('all');
  const recent = data.recentAccounts.slice(0, 6);
  const insurerParams = new URLSearchParams({ offset: '0', limit: '6' });
  if (insurer && filter !== 'all') insurerParams.set('lane', filter);
  const insurerPage = useResource<AccountPage>(insurer ? `/accounts/page?${insurerParams.toString()}` : null);
  const filtered = recent.filter(account => filter === 'all' || (filter === 'findings' ? account.anomalyCount > 0 : filter === 'ready' ? account.status === 'READY' : account.lane === filter));
  const rows = insurer ? insurerPage.data?.items || (filter === 'all' ? recent : []) : filtered;
  const counts = {
    all: insurer ? data.totalAccounts : recent.length,
    findings: recent.filter(account => account.anomalyCount > 0).length,
    ready: recent.filter(account => account.status === 'READY').length,
    GREEN: insurer ? data.byLane.GREEN : recent.filter(account => account.lane === 'GREEN').length,
    YELLOW: insurer ? data.byLane.YELLOW : recent.filter(account => account.lane === 'YELLOW').length,
    RED: insurer ? data.byLane.RED : recent.filter(account => account.lane === 'RED').length,
  };
  const filters: {key: RecentFilter | 'GREEN' | 'YELLOW' | 'RED'; label: string}[] = insurer
    ? [{key: 'all', label: 'Todas'}, {key: 'GREEN', label: 'Sin alertas'}, {key: 'YELLOW', label: 'Revisión requerida'}, {key: 'RED', label: 'Atención prioritaria'}]
    : [{key: 'all', label: 'Recientes'}, {key: 'findings', label: 'Con hallazgos'}, {key: 'ready', label: 'Listas para envío'}];
  return <section className={`${s.accountQueue} ${insurer ? s.insurerQueue : ''}`} aria-label={insurer ? 'Expedientes compartidos' : 'Cola hospitalaria de cuentas'} aria-labelledby="queue-title">
    <header className={s.queueHeading}>
      <div className={s.queueTitle}><span className={s.sectionIndex}>{insurer ? 'ASEGURADORA · SOLO LECTURA' : 'HOSPITAL · OPERACIÓN'}</span><h1 id="queue-title">{insurer ? 'Expedientes compartidos' : 'Cuentas hospitalarias'}</h1><span className={s.queueCount}>{number(data.totalAccounts)} registros · {number(rows.length)} visibles</span></div>
      <div className={s.queueActions}>
        {canReview && <Link href="/hospital/review" className={s.queueAction}><Icon name="review" size={15}/> Revisar <strong>{number(data.pendingReview)}</strong></Link>}
        {canImport && <Link href="/hospital/import" className="btn btn-primary"><Icon name="plus" size={15}/> Cargar cuenta</Link>}
        <Link href="/hospital/accounts" className={s.queueAll}>Ver todas <Icon name="arrow" size={14}/></Link>
      </div>
    </header>
    <div className={`${s.queueFilters} ${insurer ? s.insurerFilters : ''}`} role="group" aria-label={insurer ? 'Filtrar expedientes compartidos por estado' : 'Filtrar cuentas recientes'}>{filters.map(item => <button key={item.key} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}<span>{counts[item.key]}</span></button>)}</div>
    {insurer && insurerPage.error ? <ErrorState message={insurerPage.error} retry={insurerPage.reload}/> : insurer && insurerPage.loading && filter !== 'all' && !insurerPage.data ? <Loading label="Consultando expedientes"/> : rows.length ? <AccountsTable accounts={rows} compact/> : <div className={s.queueEmpty}><Icon name="accounts" size={20}/><strong>No hay cuentas en esta selección</strong><p>El índice no contiene cuentas que coincidan con este filtro.</p><button onClick={() => setFilter('all')}>Mostrar todas</button></div>}
    <footer className={s.queueFoot}><span>Mostrando {rows.length} de {number(insurer ? insurerPage.data?.total ?? counts[filter] : recent.length)} registros</span>{insurer && <span>Consulta de demostración · Sin acciones de autorización</span>}</footer>
    <div className={s.queueAnalysis}><DataDistribution title={insurer ? 'Expedientes por preauditoría' : 'Cuentas por preauditoría'} scope={`${number(data.totalAccounts)} registros del ciclo actual`} caption="Cuentas agrupadas por estado de preauditoría" values={(['GREEN','YELLOW','RED'] as const).map(lane=>({label:laneLabel[lane],value:data.byLane[lane]||0,color:lanePalette[lane]}))}/></div>
  </section>;
}

function HospitalOverview({ data, canReview, canImport }: { data: DashboardData; canReview: boolean; canImport: boolean }) {
  return <div className={s.hospitalOverview}><AccountQueue data={data} canReview={canReview} canImport={canImport}/></div>;
}

function InsurerOverview({ data }: { data: DashboardData }) {
  return <div className={s.insurerOverview}><AccountQueue data={data} insurer/></div>;
}

export default function Dashboard({ platform = false }: { platform?: boolean }) {
  const user = useUser();
  const system = platform ? 'control' : user.role === 'INSURER_DEMO' ? 'insurer' : 'hospital';
  const { data, error, loading, reload } = useResource<DashboardData>('/dashboard');
  const canImport = ['HOSPITAL_ADMIN', 'BILLING', 'REVIEWER'].includes(user.role);
  const canReview = ['HOSPITAL_ADMIN', 'REVIEWER'].includes(user.role);
  if (loading) return <Loading label="Preparando tu espacio"/>;
  if (error || !data) return <ErrorState message={error || 'No hay información disponible.'} retry={reload}/>;

  if (system === 'control') return <div className={s.consoleOverview}><PlatformPortfolio summary={data} reloadSummary={reload}/></div>;

  if (system === 'insurer') return <InsurerOverview data={data}/>;

  return <div className={s.hospitalDashboard}><HospitalOverview data={data} canReview={canReview} canImport={canImport}/></div>;
}
