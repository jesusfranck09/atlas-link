'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { api, download, post, useResource } from '@/lib/api';
import type { AccountDetail, Insurer } from '@/lib/types';
import { money } from '@/lib/format';
import {comparisonPalette} from '@/lib/chart-palette';
import { RoleGate } from './auth';
import {DataDistribution} from './data-distribution';
import { Button, ErrorState, Field, Icon, PageTitle, useToast } from './ui';
import s from './operations.module.css';

type LineInput = {key: number; code: string; description: string; category: string; quantity: string; unitPrice: string};
const newLine = (key: number): LineInput => ({key, code: '', description: '', category: 'MEDICATION', quantity: '1', unitPrice: ''});
export default function ImportAccount() {
  const router = useRouter(); const toast = useToast(); const input = useRef<HTMLInputElement>(null);
  const {data: insurers, error: insurersError, reload} = useResource<Insurer[]>('/insurers');
  const [tab, setTab] = useState('excel'); const [file, setFile] = useState<File | null>(null); const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [policy, setPolicy] = useState(true);
  const [lines, setLines] = useState<LineInput[]>([newLine(0)]); const nextKey = useRef(1);
  const enteredLines = lines.filter(line => line.code.trim() || line.description.trim());
  const categoryLabels: Record<string,string> = {MEDICATION:'Medicamento',MATERIAL:'Material',PROCEDURE:'Procedimiento',ROOM:'Estancia',LAB:'Estudio de laboratorio',FEES:'Honorarios',OTHER:'Otro'};
  function chooseFile(value: File | undefined) {setError(''); if(!value) return; if(!value.name.toLowerCase().endsWith('.xlsx')) {setError('Selecciona un archivo Excel con extensión .xlsx.'); return;} if(value.size > 2 * 1024 * 1024) {setError('El archivo supera el límite de 2 MB. Divide la cuenta o utiliza la API.'); return;} setFile(value);}
  async function importFile() {if(!file) return; setBusy(true);setError(''); const body = new FormData();body.append('file', file);try {const account = await api<AccountDetail>('/accounts/import', {method:'POST',body,headers:{'Idempotency-Key': crypto.randomUUID()}});toast('Cuenta importada y evaluada.');router.push(`/hospital/accounts/${account.id}`);}catch(e){setError(e instanceof Error ? e.message : 'No se pudo importar el archivo.');}finally{setBusy(false);}}
  async function template() {try {await download('/accounts/template', 'atlas-link-plantilla.xlsx');} catch(e){toast(e instanceof Error ? e.message : 'No se pudo descargar la plantilla.', 'error');}}
  async function create(event: FormEvent<HTMLFormElement>) {event.preventDefault();setBusy(true);setError('');const f = new FormData(event.currentTarget);try {const account = await post<AccountDetail>('/accounts', {folio:f.get('folio'),patientReference:f.get('patientReference'),insurerId:f.get('insurerId'),admissionDate:f.get('admissionDate'),dischargeDate:f.get('dischargeDate'),policyNumber:f.get('policyNumber'),diagnosis:f.get('diagnosis'),policy:policy ? {deductible:Number(f.get('deductible')),coinsuranceRate:Number(f.get('coinsuranceRate')) / 100,coinsuranceCap:Number(f.get('coinsuranceCap')),coverageAvailable:Number(f.get('coverageAvailable'))} : null,lines:lines.map(line=>({code:line.code,description:line.description,category:line.category,quantity:Number(line.quantity),unitPrice:Number(line.unitPrice)}))}, {'Idempotency-Key':crypto.randomUUID()});toast('Cuenta registrada y evaluada.');router.push(`/hospital/accounts/${account.id}`);}catch(e){setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta.');}finally{setBusy(false);}}
  function updateLine(key: number, field: keyof Omit<LineInput,'key'>, value: string) {setLines(current=>current.map(line=>line.key===key?{...line,[field]:value}:line));}
  return <RoleGate roles={['HOSPITAL_ADMIN','REVIEWER','BILLING']}><div className={s.importPage}><PageTitle title="Cargar cuentas"/><div className={s.importLayout}><section className={s.importWorkspace}><div className={s.importTabs} role="tablist" aria-label="Método de carga"><button className={tab === 'excel' ? s.importTabSelected : ''} role="tab" aria-selected={tab === 'excel'} onClick={()=>{setTab('excel');setError('');}}><Icon name="upload" size={17}/> Importar Excel</button><button className={tab === 'manual' ? s.importTabSelected : ''} role="tab" aria-selected={tab === 'manual'} onClick={()=>{setTab('manual');setError('');}}><Icon name="edit" size={17}/> Capturar cuenta</button></div>
    </section><aside className={s.importGuide}><h2>Al cargar la cuenta</h2><ol><li><span>01</span><div><strong>Validación de campos, fechas y formatos</strong></div></li><li><span>02</span><div><strong>Evaluación con el convenio vigente</strong></div></li><li><span>03</span><div><strong>Hallazgos para revisión</strong></div></li></ol><div className={s.importGuideNote}><Icon name="help" size={17}/><p>Solo datos sintéticos en esta demostración. Los errores se presentan sin modificar la cuenta de origen.</p></div></aside></div></div></RoleGate>;
}
