'use client';
import {useState} from 'react';
import {useResource} from '@/lib/api';
import {actionText,date} from '@/lib/format';
import type {HistoryItem} from '@/lib/types';
import {comparisonPalette} from '@/lib/chart-palette';
import {DataDistribution} from './data-distribution';
import {DetailsButton,RecordDetailModal} from './record-tools';
import {Button,EmptyState,ErrorState,Icon,Loading,PageTitle} from './ui';
import s from './operations.module.css';

export default function Audit() {
  const {data,error,loading,reload}=useResource<HistoryItem[]>('/audit');
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<HistoryItem|null>(null);
  const filtered=(data||[]).filter(item=>`${item.action} ${actionText(item.action)} ${item.actor} ${item.detail}`.toLowerCase().includes(search.toLowerCase()));
  const actionCounts=Array.from(filtered.reduce((counts,item)=>{const label=actionText(item.action);counts.set(label,(counts.get(label)||0)+1);return counts;},new Map<string,number>()).entries()).sort((a,b)=>b[1]-a[1]);
  const topActions=actionCounts.slice(0,4).map(([label,value])=>({label,value}));
  const otherActions=actionCounts.slice(4).reduce((sum,item)=>sum+item[1],0);
  const actionDistribution=otherActions>0?[...topActions,{label:'Otras acciones',value:otherActions}]:topActions;
  return <div className={s.auditPage}>
    <PageTitle title="Bitácora" description="Cronología de actividad registrada en el espacio de trabajo."><Button variant="secondary" onClick={reload}><Icon name="refresh" size={16}/> Actualizar</Button></PageTitle>
    <section className={s.auditList} aria-label="Actividad registrada">
      <div className={s.auditToolbar}><label className={s.searchControl}><Icon name="search" size={17}/><input placeholder="Buscar acción, persona o detalle…" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Buscar actividad"/></label><span>{filtered.length} eventos</span></div>
      {!loading&&!error&&filtered.length>0&&<div className={s.auditDistribution}><DataDistribution title="Actividad por tipo" scope={`${filtered.length} eventos en el resultado visible`} caption="Eventos agrupados por tipo de acción en el resultado visible" values={actionDistribution.map((item,index)=>({label:item.label,value:item.value,color:comparisonPalette[index%comparisonPalette.length]}))}/></div>}
      {loading?<Loading/>:error?<ErrorState message={error} retry={reload}/>:filtered.length?<><p className={s.tableScrollHint}>Desliza la lista para ver el detalle de cada evento.</p><div className={s.auditCompactRegion} tabIndex={0} role="region" aria-label="Eventos de auditoría resumidos"><ol className={s.auditCompactList}>{filtered.map((item,i)=><li className={s.auditCompactEvent} key={item.id||i}><strong>{actionText(item.action)}</strong><span>{item.actor||'Sistema'}</span><time dateTime={item.createdAt}>{date(item.createdAt,true)}</time><DetailsButton label={actionText(item.action)} onClick={()=>setSelected(item)}/></li>)}</ol></div></>:<EmptyState title="No hay eventos en esta búsqueda" description="Las acciones del equipo aparecerán en esta bitácora."/>}
    </section>
    <RecordDetailModal open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?actionText(selected.action):'Detalles del evento'} description={selected?date(selected.createdAt,true):undefined} fields={selected?[{label:'Acción',value:actionText(selected.action)},{label:'Persona',value:selected.actor||'Sistema'},{label:'Fecha',value:date(selected.createdAt,true)},{label:'Detalle registrado',value:selected.detail||'Evento registrado'}]:[]}/>
    <p className={s.disclaimer}><Icon name="lock" size={16}/> Los eventos de auditoría conservan su trazabilidad y no pueden modificarse desde la interfaz.</p>
  </div>;
}
