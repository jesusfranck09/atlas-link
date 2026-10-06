'use client';
import {useState} from 'react';
import {useResource} from '@/lib/api';
import type {AccountReport,Insurer} from '@/lib/types';
import {money,number,compactMoney,laneLabel} from '@/lib/format';
import {comparisonPalette,lanePalette} from '@/lib/chart-palette';
import {RoleGate} from './auth';
import {Metric} from './dashboard';
import {AnalyticsSculpture} from './analytics-sculpture';
import {Button,EmptyState,ErrorState,Icon,Loading,PageTitle} from './ui';

export default function Reports(){
  const [from,setFrom]=useState('');const [to,setTo]=useState('');const [insurer,setInsurer]=useState('ALL');
  const params=new URLSearchParams();if(from)params.set('from',from);if(to)params.set('to',to);if(insurer!=='ALL')params.set('insurerId',insurer);
  const {data,error,loading,reload}=useResource<AccountReport>(`/accounts/report?${params.toString()}`);
  const insurers=useResource<Insurer[]>('/insurers');
  const grouped=data?.byInsurer||[];
  function exportReport(){
    if(!data)return;
    const safe=(value:string|number)=>{const original=String(value);const content=/^[=+@-]/.test(original)?`'${original}`:original;return `"${content.replaceAll('"','""')}"`;};
    const csv='\uFEFF'+[['Aseguradora','Cuentas','Total MXN','Sin alertas','Por revisar'],...grouped.map(group=>[group.name,group.count,Number(group.total).toFixed(2),group.green,group.pending])].map(row=>row.map(safe).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='atlas-link-reporte.csv';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <RoleGate roles={['HOSPITAL_ADMIN','DIRECTOR']}><PageTitle title="Reportes"><Button variant="secondary" disabled={!data?.totalAccounts||loading} onClick={exportReport}><Icon name="download" size={17}/> Descargar reporte</Button></PageTitle>
    <div className="panel report-filters"><label>Desde<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>Hasta<input type="date" value={to} min={from} onChange={event=>setTo(event.target.value)}/></label><label>Aseguradora<select value={insurer} onChange={event=>setInsurer(event.target.value)}><option value="ALL">Todas las aseguradoras</option>{insurers.data?.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Button variant="ghost" onClick={()=>{setFrom('');setTo('');setInsurer('ALL');}}>Limpiar filtros</Button></div>
    {loading?<Loading/>:error?<ErrorState message={error} retry={reload}/>:data&&<>
      <div className="metrics-grid"><Metric label="Cuentas del periodo" value={number(data.totalAccounts)}/><Metric label="Importe facturado" value={compactMoney(data.totalBilled)} caption="MXN"/><Metric label="Sin alertas" value={`${data.totalAccounts?Math.round(data.greenCount/data.totalAccounts*100):0}%`} caption={`${number(data.greenCount)} cuentas`}/><Metric label="Cuentas con respuesta" value={number(data.resolvedCount)}/></div>
      <div className="report-grid">
        <section className="panel glass-analytics"><div className="panel-heading"><h2>Cuentas por aseguradora</h2></div>
          {grouped.length ? <div className="report-sculpture"><AnalyticsSculpture values={grouped.map((group,index)=>({label:group.name,value:group.count,color:comparisonPalette[index%comparisonPalette.length]}))} variant="pie" density="compact" finish="glass" minimal caption="Número de cuentas por aseguradora en el periodo seleccionado"/></div> : <EmptyState title="Sin cuentas en el periodo" description="Amplía los filtros para consultar tu operación."/>}
        </section>
        <section className="panel glass-analytics"><div className="panel-heading"><h2>Estado de preauditoría</h2></div><div className="report-sculpture"><AnalyticsSculpture values={(['GREEN','YELLOW','RED'] as const).map(lane=>({label:laneLabel[lane],value:data.byLane[lane]||0,color:lanePalette[lane]}))} variant="bars" density="compact" finish="glass" minimal caption="Número de cuentas según su estado de preauditoría"/></div></section>
      </div>
      <section className="panel"><div className="panel-heading"><h2>Detalle por aseguradora</h2></div><div className="table-scroll" tabIndex={0} role="region" aria-label="Resumen por aseguradora"><table className="data-table"><thead><tr><th>Aseguradora</th><th>Cuentas</th><th>Facturado · MXN</th><th>Sin alertas</th><th>Por revisar</th></tr></thead><tbody>{grouped.map(group=><tr key={group.insurerId}><td><strong>{group.name}</strong></td><td>{number(group.count)}</td><td className="number-cell">{money(group.total)}</td><td>{number(group.green)}</td><td>{number(group.pending)}</td></tr>)}</tbody></table></div></section><div className="subtle-note"><Icon name="help" size={16}/> Cuentas recibidas en el periodo (Ciudad de México). Sin alertas no implica aprobación de aseguradora ni ahorro demostrado.</div>
    </>}
  </RoleGate>;
}
