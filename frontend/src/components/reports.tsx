'use client';
import {useMemo, useState} from 'react';
import {useResource} from '@/lib/api';
import type {AccountReport, Insurer} from '@/lib/types';
import {money, number, compactMoney, laneLabel} from '@/lib/format';
import {comparisonPalette, lanePalette} from '@/lib/chart-palette';
import {RoleGate} from './auth';
import {DataDistribution} from './data-distribution';
import {DetailsButton, RecordDetailModal} from './record-tools';
import tools from './record-tools.module.css';
import {Button, EmptyState, ErrorState, Icon, Loading, PageTitle} from './ui';
import s from './operations.module.css';

export default function Reports() {
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [insurer,setInsurer]=useState('ALL');
  const params=new URLSearchParams(); if(from)params.set('from',from); if(to)params.set('to',to); if(insurer!=='ALL')params.set('insurerId',insurer);
  const {data,error,loading,reload}=useResource<AccountReport>(`/accounts/report?${params.toString()}`);
  const insurers=useResource<Insurer[]>('/insurers'); const grouped=data?.byInsurer||[];
  const [selected, setSelected] = useState<AccountReport['byInsurer'][number] | null>(null);
  const scope = useMemo(() => [from && `desde ${from}`, to && `hasta ${to}`, insurer !== 'ALL' && 'aseguradora seleccionada'].filter(Boolean).join(' · ') || 'todo el periodo disponible', [from, to, insurer]);
  function exportReport() {
    if(!data)return;
    const safe=(value:string|number)=>{const original=String(value);const content=/^[=+@-]/.test(original)?`'${original}`:original;return `"${content.replaceAll('"','""')}"`;};
    const csv='\uFEFF'+[['Aseguradora','Cuentas','Total MXN','Sin alertas','Por revisar'],...grouped.map(group=>[group.name,group.count,Number(group.total).toFixed(2),group.green,group.pending])].map(row=>row.map(safe).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='atlas-link-reporte.csv';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <RoleGate roles={['HOSPITAL_ADMIN','DIRECTOR']}><div className={s.reportsPage}>
    <PageTitle title="Reportes" description="Consulta la actividad agregada y su distribución en el periodo seleccionado."><Button variant="secondary" disabled={!data?.totalAccounts||loading} onClick={exportReport}><Icon name="download" size={17}/> Descargar reporte</Button></PageTitle>
    <section className={s.reportFilters} aria-label="Filtros del reporte"><label>Desde<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>Hasta<input type="date" value={to} min={from} onChange={event=>setTo(event.target.value)}/></label><label>Aseguradora<select value={insurer} onChange={event=>setInsurer(event.target.value)}><option value="ALL">Todas las aseguradoras</option>{insurers.data?.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Button variant="ghost" onClick={()=>{setFrom('');setTo('');setInsurer('ALL');}}>Limpiar filtros</Button></section>
    {loading?<Loading/>:error?<ErrorState message={error} retry={reload}/>:data&&<>
      <section className={s.reportOverview} aria-label="Resumen del periodo"><div className={s.reportLead}><span>CUENTAS DEL PERIODO</span><strong>{number(data.totalAccounts)}</strong></div><dl className={s.reportAnnotations}><div><dt>Importe facturado</dt><dd>{compactMoney(data.totalBilled)} <small>MXN</small></dd></div><div><dt>Sin alertas</dt><dd>{data.totalAccounts?Math.round(data.greenCount/data.totalAccounts*100):0}% <small>{number(data.greenCount)} cuentas</small></dd></div><div><dt>Cuentas con respuesta</dt><dd>{number(data.resolvedCount)}</dd></div></dl></section>
      <div className={s.reportVisualizations}>
        {grouped.length ? <DataDistribution title="Cuentas por aseguradora" scope={`Periodo: ${scope}`} caption="Número de cuentas por aseguradora en el periodo seleccionado" values={grouped.map((group,index)=>({label:group.name,value:group.count,color:comparisonPalette[index%comparisonPalette.length]}))}/> : <EmptyState title="Sin cuentas en el periodo" description="Amplía los filtros para consultar tu operación."/>}
        <DataDistribution title="Estado de preauditoría" scope={`Mismo periodo: ${scope}`} caption="Número de cuentas según su estado de preauditoría" values={(['GREEN','YELLOW','RED'] as const).map(lane=>({label:laneLabel[lane],value:data.byLane[lane]||0,color:lanePalette[lane]}))}/>
      </div>
      <section className={s.reportTableSection}><div className={s.reportTableHeading}><h2>Detalle por aseguradora</h2><span>{grouped.length} aseguradoras</span></div><p className={s.tableScrollHint}>Desliza la tabla para consultar todas las columnas.</p><div className={s.tableRegion} tabIndex={0} role="region" aria-label="Resumen por aseguradora"><table className={`${s.reportTable} ${tools.compactTable}`}><thead><tr><th scope="col">Aseguradora</th><th scope="col">Cuentas</th><th scope="col">Facturado · MXN</th><th scope="col">Sin alertas</th><th scope="col">Por revisar</th><th scope="col">Detalle</th></tr></thead><tbody>{grouped.map(group=><tr key={group.insurerId}><td><strong>{group.name}</strong></td><td>{number(group.count)}</td><td className={s.numberCell}>{money(group.total)}</td><td>{number(group.green)}</td><td>{number(group.pending)}</td><td className={tools.actionCell}><DetailsButton label={group.name} onClick={()=>setSelected(group)}/></td></tr>)}</tbody></table></div></section><p className={s.disclaimer}><Icon name="help" size={16}/> Cuentas recibidas en el periodo. Sin alertas no implica aprobación de aseguradora ni ahorro demostrado.</p>
      <RecordDetailModal open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?.name||'Detalle por aseguradora'} description={`Periodo: ${scope}`} fields={selected?[{label:'Cuentas recibidas',value:number(selected.count)},{label:'Facturado · MXN',value:money(selected.total)},{label:'Sin alertas',value:number(selected.green)},{label:'Por revisar',value:number(selected.pending)}]:[]}/>
    </>}
  </div></RoleGate>;
}
