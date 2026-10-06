'use client';
import {useState,type FormEvent} from 'react';
import {patch,post,useResource} from '@/lib/api';
import {date,initials,roleLabel} from '@/lib/format';
import type {Role,User} from '@/lib/types';
import {RoleGate,useUser} from './auth';
import {DataDistribution} from './data-distribution';
import {DetailsButton,RecordDetailModal} from './record-tools';
import tools from './record-tools.module.css';
import {comparisonPalette} from '@/lib/chart-palette';
import {Button,EmptyState,ErrorState,Field,Icon,Loading,Modal,PageTitle,useToast} from './ui';
import s from './operations.module.css';

export default function Users({platform=false}:{platform?:boolean}) {
  const me=useUser(); const {data,error,loading,reload}=useResource<User[]>('/users'); const toast=useToast();
  const [search,setSearch]=useState(''); const [create,setCreate]=useState(false); const [edit,setEdit]=useState<User|null>(null); const [selected,setSelected]=useState<User|null>(null); const [busy,setBusy]=useState(false); const [formError,setFormError]=useState('');
  const roles:Role[]=platform?['PLATFORM_ADMIN']:['HOSPITAL_ADMIN','BILLING','REVIEWER','DIRECTOR'];
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setFormError(''); const f=new FormData(e.currentTarget);
    try {if(edit) await patch(`/users/${edit.id}`,{role:f.get('role'),active:f.get('active')==='on'}); else await post('/users',{name:f.get('name'),email:f.get('email'),role:f.get('role'),password:f.get('password')}); setEdit(null); setCreate(false); reload(); toast(edit?'Acceso actualizado.':'Usuario creado en el entorno de demostración.');}
    catch(err) {setFormError(err instanceof Error?err.message:'No se pudo guardar el usuario.');} finally {setBusy(false);}
  }
  const filtered=(data||[]).filter(u=>`${u.name} ${u.email} ${roleLabel[u.role]}`.toLowerCase().includes(search.toLowerCase()));
  return <RoleGate roles={platform?['PLATFORM_ADMIN']:['HOSPITAL_ADMIN']}><div className={s.usersPage}>
    <PageTitle title={platform?'Equipo Atlas':'Equipo y accesos'} description="Directorio de personas, roles y estado de acceso."><Button onClick={()=>{setCreate(true);setFormError('');}}><Icon name="plus" size={17}/> Agregar persona</Button></PageTitle>
    <section className={s.usersDirectory} aria-label="Directorio del equipo">
      <div className={s.usersToolbar}><label className={s.searchControl}><Icon name="search" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar una persona o un rol…" aria-label="Buscar usuarios"/></label><span>{filtered.length} personas</span></div>
      {!loading&&!error&&filtered.length>0&&<div className={s.userDistribution}><DataDistribution title="Equipo por rol" scope={`${filtered.length} usuarios visibles después de la búsqueda`} caption="Usuarios agrupados por rol en el resultado visible" values={Array.from(new Set(filtered.map(user=>user.role))).map((role,index)=>({label:roleLabel[role],value:filtered.filter(user=>user.role===role).length,color:comparisonPalette[index%comparisonPalette.length]}))}/></div>}
      {loading?<Loading/>:error?<ErrorState message={error} retry={reload}/>:filtered.length?<><p className={s.tableScrollHint}>Desliza la tabla para consultar todas las columnas.</p><div className={s.tableRegion} tabIndex={0} role="region" aria-label="Personas y accesos del equipo"><table className={`${s.usersTable} ${tools.compactTable}`}><thead><tr><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Detalles</th></tr></thead><tbody>{filtered.map(user=><tr key={user.id}><td><div className={s.personCell}><span className={s.userAvatar}>{initials(user.name)}</span><div><strong>{user.name}{user.id===me.id&&<span className={s.youLabel}>Tú</span>}</strong></div></div></td><td>{roleLabel[user.role]}</td><td><span className={`badge ${user.active?'badge-green':'badge-neutral'}`}>{user.active?'Activo':'Desactivado'}</span></td><td className={tools.actionCell}><DetailsButton label={user.name} onClick={()=>setSelected(user)}/></td></tr>)}</tbody></table></div></>:<EmptyState title="No encontramos a esa persona" description="Prueba otra búsqueda o agrega una persona al equipo."/>}
    </section>
    <Modal open={create||Boolean(edit)} onClose={()=>{if(!busy){setCreate(false);setEdit(null);}}} title={edit?'Gestionar acceso':'Agregar persona'} description={edit?.name||'Define el rol y la contraseña de demostración.'}><div className={s.userDialog}><form onSubmit={submit} key={edit?.id||'new'}>{!edit&&<><Field label="Nombre" required><input name="name" required maxLength={120} autoComplete="off"/></Field><Field label="Correo" required><input name="email" type="email" required maxLength={180} autoComplete="off"/></Field></>}<Field label="Rol" required><select name="role" defaultValue={edit?.role||roles[0]}>{roles.map(role=><option value={role} key={role}>{roleLabel[role]}</option>)}{edit?.role==='INSURER_DEMO'&&<option value="INSURER_DEMO">{roleLabel.INSURER_DEMO}</option>}</select></Field>{edit?<label className="checkbox-label"><input type="checkbox" name="active" defaultChecked={edit.active}/><span>Acceso activo</span></label>:<Field label="Contraseña inicial de demostración" required hint="Mínimo 12 caracteres. Compártela por un canal seguro; no se envía invitación automática."><input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password"/></Field>}{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={()=>{setCreate(false);setEdit(null);}}>Cancelar</Button><Button loading={busy} type="submit">{edit?'Guardar acceso':'Crear usuario'}</Button></div></form></div></Modal>
    <RecordDetailModal open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?.name||'Detalles de usuario'} description={selected?.id===me.id?'Usuario actual':'Información del directorio'} fields={selected?[{label:'Nombre',value:selected.name},{label:'Correo',value:selected.email},{label:'Rol',value:roleLabel[selected.role]},{label:'Estado de acceso',value:selected.active?'Activo':'Desactivado'},{label:'Organización',value:selected.tenantName},{label:'Alta',value:selected.createdAt?date(selected.createdAt,true):'Sin dato'}]:[]}>
      {selected && <div className={s.recordModalActions}><Button onClick={()=>{const user=selected;setSelected(null);setEdit(user);setFormError('');}}><Icon name="edit" size={15}/> Gestionar acceso</Button></div>}
    </RecordDetailModal>
  </div></RoleGate>;
}
