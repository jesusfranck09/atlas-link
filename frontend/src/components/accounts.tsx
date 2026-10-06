'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useResource } from '@/lib/api';
import type { Account, AccountPage } from '@/lib/types';
import { laneLabel, number, statusLabel } from '@/lib/format';
import {lanePalette} from '@/lib/chart-palette';
import { useUser } from './auth';
import {DataDistribution} from './data-distribution';
import AccountsTable from './accounts-table';
import { Button, ErrorState, Icon, Loading, PageTitle } from './ui';
import s from './operations.module.css';

const PAGE_SIZE = 12;
export default function Accounts({review = false}: {review?: boolean}) {
  const user = useUser(); const params = useSearchParams();
  const urlSearch = params.get('search') || '';
  const urlLane = params.get('lane') || 'ALL';
  const [searchState, setSearchState] = useState({source: urlSearch, value: urlSearch});
  const [laneState, setLaneState] = useState({source: urlLane, value: urlLane});
  const query = searchState.source === urlSearch ? searchState.value : urlSearch;
  const lane = laneState.source === urlLane ? laneState.value : urlLane;
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [status, setStatus] = useState('ALL');
  const [position, setPosition] = useState({filters: '', offset: 0});
  useEffect(() => {const timer = setTimeout(() => setDebouncedQuery(query), 300); return () => clearTimeout(timer);}, [query]);
  const filterKey = `${debouncedQuery}|${lane}|${status}|${review}`;
  const offset = position.filters === filterKey ? position.offset : 0;
  const request = new URLSearchParams({offset: String(offset), limit: String(PAGE_SIZE)});
  if (debouncedQuery.trim()) request.set('search', debouncedQuery.trim());
  if (lane !== 'ALL') request.set('lane', lane);
  if (status !== 'ALL') request.set('status', status);
  if (review && status === 'ALL') request.set('status', 'RECEIVED,EVALUATED,IN_REVIEW');
  const {data, error, loading, reload} = useResource<AccountPage>(`/accounts/page?${request.toString()}`);
  const items: Account[] = data?.items || [];
  const total = data?.total || 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  function changePage(nextOffset: number) {setPosition({filters: filterKey, offset: nextOffset});}
  const insurerView = user.role === 'INSURER_DEMO';
  return <div className={s.accountsPage}>
    <PageTitle title={review ? 'Bandeja de revisión' : insurerView ? 'Consulta de cuentas' : 'Cuentas hospitalarias'} description={insurerView ? 'Solo lectura · Datos de demostración' : review ? 'Cuentas que requieren revisión del equipo.' : 'Registro de cuentas y su estado de preauditoría.'}>
      <Button variant="secondary" onClick={reload}><Icon name="refresh" size={16}/> Actualizar</Button>
      {['HOSPITAL_ADMIN', 'BILLING', 'REVIEWER'].includes(user.role) && <Link className="btn btn-primary" href="/hospital/import"><Icon name="plus" size={17}/> Cargar cuenta</Link>}
    </PageTitle>
    <section className={s.accountsList} aria-label={review ? 'Cuentas en revisión' : 'Registro de cuentas'}>
      <div className={s.accountsQuery}>
        <div className={s.laneFilters} role="group" aria-label="Filtrar por preauditoría">
          {[{key:'ALL',label:'Todas las cuentas'}, {key:'GREEN',label:'Sin alertas'}, {key:'YELLOW',label:'Por revisar'}, {key:'RED',label:'Prioritarias'}].map(tab => <button key={tab.key} className={lane === tab.key ? s.laneSelected : ''} onClick={() => setLaneState({source: urlLane, value: tab.key})} aria-pressed={lane === tab.key}>{tab.key !== 'ALL' && <span className={`dot ${tab.key === 'GREEN' ? 'teal' : tab.key === 'YELLOW' ? 'amber' : 'coral'}`}/>} {tab.label}</button>)}
        </div>
        <div className={s.accountsToolbar}>
          <div className={s.searchControl}><Icon name="search" size={18}/><input aria-label="Buscar cuentas" value={query} onChange={e => setSearchState({source: urlSearch, value: e.target.value})} placeholder="Buscar por folio, referencia o aseguradora…"/></div>
          <label className={s.filterField}><span>Estado</span><select aria-label="Filtrar por estado" value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">Todos los estados</option>{Object.entries(statusLabel).filter(([key]) => !review || ['RECEIVED', 'EVALUATED', 'IN_REVIEW'].includes(key)).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <span className={s.sortNote}>Más recientes primero</span>
        </div>
      </div>
      {!loading&&!error&&items.length>0&&<div className={s.accountsDistribution}><DataDistribution title="Cuentas por preauditoría" scope={`Página ${currentPage} · ${items.length} registros del resultado filtrado`} caption="Cuentas agrupadas por estado de preauditoría en esta página" values={(['GREEN','YELLOW','RED'] as const).map(lane=>({label:laneLabel[lane],value:items.filter(account=>account.lane===lane).length,color:lanePalette[lane]}))}/></div>}
      {!loading && !error && items.length > 0 && <p className={s.tableScrollHint}>Desliza la tabla para ver todas las columnas.</p>}
      {loading ? <Loading/> : error ? <ErrorState message={error} retry={reload}/> : <AccountsTable accounts={items}/>}
      <div className={s.tablePagination}><span aria-live="polite">{total ? `${number(offset + 1)}–${number(offset + items.length)} de ${number(total)}` : '0'} cuentas · Datos sintéticos</span><nav aria-label="Paginación de cuentas" className={s.pager}><button className={s.pageButton} disabled={loading || offset === 0} onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))} aria-label="Página anterior">←</button><span>Página {currentPage} de {pages}</span><button className={s.pageButton} disabled={loading || offset + PAGE_SIZE >= total} onClick={() => changePage(offset + PAGE_SIZE)} aria-label="Página siguiente">→</button></nav></div>
    </section>
    <p className={s.disclaimer}><Icon name="shield" size={16}/> Los resultados de preauditoría son estimaciones basadas en el convenio. La autorización corresponde a la aseguradora.</p>
  </div>;
}
