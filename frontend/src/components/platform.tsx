'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { patch, post, useResource } from '@/lib/api';
import { date, initials, number } from '@/lib/format';
import { comparisonPalette } from '@/lib/chart-palette';
import type { Lead, License, Tenant } from '@/lib/types';
import { DataDistribution } from './data-distribution';
import { Button, EmptyState, ErrorState, Field, Icon, Loading, Modal, PageTitle, useToast } from './ui';
import s from './platform.module.css';

function StatusBadge({ tenant }: { tenant: Tenant }) {
  const active = tenant.status === 'ACTIVE';
  const trial = tenant.status === 'TRIAL';
  const label = tenantStatusLabel(tenant.status);

  return <span className={`badge ${active ? 'badge-green' : trial ? 'badge-blue' : 'badge-neutral'}`}>{label}</span>;
}

export function Tenants() {
  const params = useSearchParams();
  const urlSearch = params.get('search') || '';
  const [queryState, setQueryState] = useState({ source: urlSearch, value: urlSearch });
  const search = queryState.source === urlSearch ? queryState.value : urlSearch;
  const setSearch = (value: string) => setQueryState({ source: urlSearch, value });
  const { data, error, loading, reload } = useResource<Tenant[]>('/tenants');
  const { data: licenseData, error: licenseError, loading: licenseLoading } = useResource<License[]>('/licenses');
  const toast = useToast();
  const [create, setCreate] = useState(params.get('new') === 'true');
  const [adminTenant, setAdminTenant] = useState<Tenant | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [withAdmin, setWithAdmin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const f = new FormData(e.currentTarget);
    const admin = { name: f.get('adminName'), email: f.get('adminEmail'), password: f.get('adminPassword') };
    try {
      if (adminTenant) {
        await post(`/tenants/${adminTenant.id}/administrator`, admin);
        toast('Acceso del administrador hospitalario configurado.');
        setAdminTenant(null);
      } else {
        const tenant = await post<Tenant>('/tenants', { name: f.get('name'), slug: f.get('slug'), ...(withAdmin ? { admin } : {}) });
        setCreate(false);
        if (tenant.provisioning?.status === 'PENDING') {
          setAdminTenant(tenant);
          setFormError(tenant.provisioning.message || 'El hospital está registrado. Falta completar el acceso del administrador.');
          toast('Hospital creado; acceso administrativo pendiente.', 'error');
        } else {
          toast('Hospital registrado con una licencia de prueba.');
        }
      }
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar el hospital.');
    } finally {
      setBusy(false);
    }
  }

  const filtered = (data || []).filter(tenant => `${tenant.name} ${tenant.slug}`.toLowerCase().includes(search.toLowerCase()));
  const detailsLicense = detailsTenant ? licenseForTenant(licenseData, detailsTenant.id) : undefined;
  const tenantDistribution = distributionByStatus(filtered.map(tenant => tenant.status), tenantStatusLabel);

  return <div className={s.module}>
    <PageTitle eyebrow="Atlas · Red de organizaciones" title="Hospitales" description="Identidad, actividad y accesos de cada espacio conectado."><Button onClick={() => { setCreate(true); setFormError(''); setWithAdmin(true); }}><Icon name="plus" size={17}/> Registrar hospital</Button></PageTitle>
    <div className={s.registryToolbar}>
      <label className={s.searchControl}>
        <Icon name="search" size={17}/>
        <input placeholder="Buscar hospital…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar hospital"/>
      </label>
      <span className={s.resultCount}><strong>{number(filtered.length)}</strong> {filtered.length === 1 ? 'resultado' : 'resultados'}</span>
    </div>

    {!loading && !error && filtered.length > 0 && <div className={s.distributionGrid}>
      <DataDistribution title="Hospitales por estado" scope={`Búsqueda actual · ${number(filtered.length)} hospitales`} caption="Número de hospitales por estado entre los resultados visibles." values={tenantDistribution}/>
    </div>}

    {loading ? <Loading/> : error ? <ErrorState message={error} retry={reload}/> : filtered.length ? <div className={`table-scroll ${s.platformTableRegion}`} tabIndex={0} role="region" aria-label="Hospitales registrados">
      <table className={`data-table ${s.platformTable}`} data-record-type="tenant">
        <thead><tr><th scope="col">Hospital</th><th scope="col">Estado</th><th scope="col">Cuentas</th><th scope="col">Usuarios</th><th scope="col">Alta</th><th scope="col">Detalles</th></tr></thead>
        <tbody>{filtered.map(tenant => <tr key={tenant.id}>
          <td className={s.platformIdentity}><strong>{tenant.name}</strong><small>{tenant.slug}</small></td>
          <td><StatusBadge tenant={tenant}/></td>
          <td>{readCount(tenant.accountCount)}</td>
          <td>{readCount(tenant.userCount)}</td>
          <td>{date(tenant.createdAt)}</td>
          <td><button type="button" className={s.quietAction} onClick={() => setDetailsTenant(tenant)}>Detalles</button></td>
        </tr>)}</tbody>
      </table>
    </div> : <EmptyState title="Sin hospitales" description="Registra un hospital o cambia la búsqueda."/>}

    <Modal open={create || Boolean(adminTenant)} onClose={() => { if (!busy) { setCreate(false); setAdminTenant(null); } }} title={adminTenant ? 'Configurar primer administrador' : 'Registrar hospital'} description={adminTenant?.name || 'El registro crea un espacio independiente y una licencia de prueba.'}>
      <form className={s.dialogForm} onSubmit={submit} key={adminTenant?.id || 'new'}>
        {!adminTenant && <>
          <Field label="Nombre del hospital" required><input name="name" required maxLength={160} placeholder="Hospital Horizonte"/></Field>
          <Field label="Identificador del espacio" required hint="Letras minúsculas, números y guiones. Debe ser único."><input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required minLength={3} maxLength={60} placeholder="hospital-horizonte"/></Field>
          <label className={`checkbox-label ${s.checkbox}`}><input type="checkbox" checked={withAdmin} onChange={e => setWithAdmin(e.target.checked)}/><span>Configurar ahora el primer administrador hospitalario.</span></label>
        </>}
        {(adminTenant || withAdmin) && <>
          <div className={s.formDivider}/>
          <Field label="Nombre del administrador" required><input name="adminName" required maxLength={120} autoComplete="off"/></Field>
          <Field label="Correo del administrador" required><input name="adminEmail" type="email" required maxLength={180} autoComplete="off"/></Field>
          <Field label="Contraseña inicial" required hint="Mínimo 12 caracteres. No se envía un correo automático."><input name="adminPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></Field>
        </>}
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className={s.dialogActions}><Button type="button" variant="secondary" onClick={() => { setCreate(false); setAdminTenant(null); }}>Cancelar</Button><Button type="submit" loading={busy}>{adminTenant ? 'Crear acceso' : 'Registrar hospital'}</Button></div>
      </form>
    </Modal>

    <Modal open={Boolean(detailsTenant)} onClose={() => setDetailsTenant(null)} title={detailsTenant?.name || 'Hospital'} description="Identidad y actividad del espacio registrado">
      {detailsTenant && <><dl className={s.detailGrid}>
        <DetailField label="Organización" value={detailsTenant.name}/>
        <DetailField label="Identificador" value={detailsTenant.slug}/>
        <DetailField label="Estado" value={<StatusBadge tenant={detailsTenant}/>}/>
        <DetailField label="Cuentas registradas" value={readCount(detailsTenant.accountCount)}/>
        <DetailField label="Usuarios" value={readCount(detailsTenant.userCount)}/>
        <DetailField label="Fecha de alta" value={date(detailsTenant.createdAt, true)}/>
        <DetailField label="Vigencia" value={licenseLoading ? 'Cargando vigencia…' : licenseError ? 'No disponible' : detailsLicense?.expiresAt ? date(detailsLicense.expiresAt, true) : 'Sin vigencia registrada'} />
        {detailsTenant.provisioning && <DetailField label="Provisionamiento" value={detailsTenant.provisioning.status === 'READY' ? 'Completado' : 'Pendiente'}/>}
      </dl><div className={s.recordModalActions}><Link href="/admin/licenses" className="btn btn-secondary">Configurar licencia <Icon name="arrow" size={15}/></Link><Button variant="secondary" onClick={() => { const tenant = detailsTenant; setDetailsTenant(null); setAdminTenant(tenant); setFormError(''); }}>Configurar acceso <Icon name="edit" size={15}/></Button></div></>}
    </Modal>
  </div>;
}

const licenseStatus = { TRIAL: 'En prueba', ACTIVE: 'Activa', SUSPENDED: 'Suspendida', EXPIRED: 'Vencida' };

function LicenseBadge({ license }: { license: License }) {
  const kind = license.status === 'ACTIVE' ? 'badge-green' : license.status === 'TRIAL' ? 'badge-blue' : license.status === 'SUSPENDED' ? 'badge-yellow' : 'badge-neutral';
  return <span className={`badge ${kind}`}>{licenseStatus[license.status]}</span>;
}

function LicenseCapacity({ license }: { license: License }) {
  return <div className={s.capacity}>
    <span><b>{license.usedAccounts === null ? 'Uso no disponible' : number(license.usedAccounts)}</b><small> / {number(license.monthlyAccountLimit)} cuentas</small></span>
    {license.usedAccounts !== null && <div className={s.capacityTrack} aria-hidden="true"><span style={{ width: `${Math.min(100, license.usedAccounts / license.monthlyAccountLimit * 100)}%` }}/></div>}
  </div>;
}

export function Licenses() {
  const { data, error, loading, reload } = useResource<License[]>('/licenses');
  const toast = useToast();
  const [edit, setEdit] = useState<License | null>(null);
  const [details, setDetails] = useState<License | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('ALL');

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setFormError('');
    const f = new FormData(e.currentTarget);
    try {
      await patch(`/licenses/${edit.id}`, { version: edit.version, plan: f.get('plan'), status: f.get('status'), monthlyAccountLimit: Number(f.get('monthlyAccountLimit')), seatLimit: Number(f.get('seatLimit')), expiresAt: `${f.get('expiresAt')}T23:59:59-06:00` });
      setEdit(null);
      reload();
      toast('La capacidad y la vigencia se actualizaron.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo actualizar la licencia.');
    } finally {
      setBusy(false);
    }
  }

  const licenses = (data || []).filter(license => filter === 'ALL' || license.status === filter);
  const licenseDistribution = distributionByStatus(licenses.map(license => license.status), status => licenseStatus[status as keyof typeof licenseStatus] || status);
  const activeCount = data?.filter(license => license.status === 'ACTIVE' || license.status === 'TRIAL').length;

  return <div className={s.module}>
    <PageTitle eyebrow="Atlas · Capacidad de red" title="Licencias"><Button variant="secondary" onClick={reload}><Icon name="refresh" size={16}/> Actualizar</Button></PageTitle>

    <section className={s.licenseSection} aria-labelledby="licenses-title">
      <header className={s.licenseToolbar}>
        <div className={s.sectionHeading}><div><h2 id="licenses-title">{loading ? 'Licencias' : `${number(data?.length || 0)} licencias · ${number(activeCount || 0)} vigentes o en prueba`}</h2></div></div>
        <div className={s.licenseTools}>
          <span className={s.resultCount}><strong>{number(licenses.length)}</strong> {licenses.length === 1 ? 'licencia' : 'licencias'}</span>
          <label className={s.filterControl}><span>Estado</span><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filtrar estado de licencia"><option value="ALL">Todos</option>{Object.entries(licenseStatus).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        </div>
      </header>
      {!loading && !error && licenses.length > 0 && <div className={s.distributionGrid}>
        <DataDistribution title="Licencias por estado" scope={`Filtro actual · ${number(licenses.length)} ${licenses.length === 1 ? 'licencia' : 'licencias'}`} caption="Número de licencias por estado dentro del conjunto filtrado." values={licenseDistribution}/>
      </div>}
      {loading ? <Loading/> : error ? <ErrorState message={error} retry={reload}/> : licenses.length ? <div className={`table-scroll ${s.platformTableRegion}`} tabIndex={0} role="region" aria-label="Licencias por hospital">
        <table className={`data-table ${s.platformTable}`} data-record-type="license">
          <thead><tr><th scope="col">Hospital</th><th scope="col">Estado</th><th scope="col"><span className={s.capacityHeadingFull}>Uso / capacidad mensual</span><span className={s.capacityHeadingMobile}>Uso</span></th><th scope="col">Personas</th><th scope="col">Vigencia</th><th scope="col">Detalle</th></tr></thead>
          <tbody>{licenses.map(license => <tr key={license.id}>
            <td className={s.platformIdentity}><strong>{license.tenantName}</strong><small>{license.plan}</small></td>
            <td><LicenseBadge license={license}/></td>
            <td><LicenseCapacity license={license}/></td>
            <td>{number(license.seatLimit)}</td>
            <td>{date(license.expiresAt)}</td>
            <td><button type="button" className={s.quietAction} onClick={() => setDetails(license)}>Detalles</button></td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState title="Sin licencias en esta vista" description="Registra un hospital para comenzar con una licencia de prueba."/>}
    </section>

    <Modal open={Boolean(edit)} onClose={() => { if (!busy) setEdit(null); }} title="Configurar licencia" description={edit?.tenantName}>
      {edit && <form className={s.dialogForm} onSubmit={save} key={edit.id}>
        <div className={`form-grid ${s.licenseFormGrid}`}>
          <Field label="Nombre del plan" required><input name="plan" required maxLength={100} defaultValue={edit.plan}/></Field>
          <Field label="Estado" required><select name="status" defaultValue={edit.status}>{Object.entries(licenseStatus).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></Field>
          <Field label="Cuentas por mes" required><input name="monthlyAccountLimit" type="number" min="1" step="1" required defaultValue={edit.monthlyAccountLimit}/></Field>
          <Field label="Límite de personas" required><input name="seatLimit" type="number" min="1" step="1" required defaultValue={edit.seatLimit}/></Field>
          <Field label="Vigente hasta" required className="span-two"><input name="expiresAt" type="date" required defaultValue={edit.expiresAt.slice(0, 10)}/></Field>
        </div>
        <p className={s.formNote}>Los cambios de capacidad se aplican a las siguientes operaciones del hospital. La facturación comercial se acuerda por separado.</p>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className={s.dialogActions}><Button type="button" variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button><Button type="submit" loading={busy}>Guardar licencia</Button></div>
      </form>}
    </Modal>

    <Modal open={Boolean(details)} onClose={() => setDetails(null)} title={details?.tenantName || 'Licencia'} description="Capacidad y vigencia registradas">
      {details && <><dl className={s.detailGrid}>
        <DetailField label="Organización" value={details.tenantName}/>
        <DetailField label="Plan" value={details.plan}/>
        <DetailField label="Estado" value={<LicenseBadge license={details}/>}/>
        <DetailField label="Cuentas por mes" value={number(details.monthlyAccountLimit)}/>
        <DetailField label="Uso de cuentas" value={details.usedAccounts === null ? 'Sin lectura' : `${number(details.usedAccounts)} cuentas`}/>
        <DetailField label="Personas con acceso" value={number(details.seatLimit)}/>
        <DetailField label="Vigente desde" value={date(details.startsAt, true)}/>
        <DetailField label="Vigente hasta" value={date(details.expiresAt, true)}/>
      </dl><div className={s.recordModalActions}><Button onClick={() => { const license = details; setDetails(null); setEdit(license); setFormError(''); }}><Icon name="edit" size={15}/> Configurar licencia</Button></div></>}
    </Modal>
  </div>;
}

function LeadIdentity({ lead }: { lead: Lead }) {
  return <div className={s.leadIdentity}>
    <span className={s.leadInitials} aria-hidden="true">{initials(lead.name)}</span>
    <div><strong>{lead.name}</strong><small>{lead.email}</small></div>
  </div>;
}

export function Leads() {
  const toast = useToast();
  const { data, error, loading, reload } = useResource<Lead[]>('/leads');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [query, setQuery] = useState('');
  const filtered = (data || []).filter(lead => `${lead.name} ${lead.email} ${lead.organization}`.toLowerCase().includes(query.toLowerCase()));
  const organizationDistribution = distributionByOrganization(filtered);

  return <div className={s.module}>
    <PageTitle eyebrow="Atlas · Seguimiento" title="Solicitudes comerciales" description="Consultas recibidas desde el formulario de contacto."><Button variant="secondary" onClick={reload}><Icon name="refresh" size={16}/> Actualizar</Button></PageTitle>
    <section className={s.leadSection} aria-label="Solicitudes comerciales">
      <div className={s.leadToolbar}>
        <label className={s.searchControl}>
          <Icon name="search" size={17}/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar persona, correo u hospital…" aria-label="Buscar solicitudes"/>
        </label>
        <span className={s.resultCount}><strong>{number(filtered.length)}</strong> {filtered.length === 1 ? 'solicitud' : 'solicitudes'}</span>
      </div>
      {!loading && !error && filtered.length > 0 && <div className={s.distributionGrid}>
        <DataDistribution title="Solicitudes por organización" scope={`Búsqueda actual · ${number(filtered.length)} solicitudes`} caption="Número de solicitudes comerciales recibidas por organización." values={organizationDistribution}/>
      </div>}
      {loading ? <Loading/> : error ? <ErrorState message={error} retry={reload}/> : filtered.length ? <div className={`table-scroll ${s.platformTableRegion}`} tabIndex={0} role="region" aria-label="Solicitudes comerciales recibidas">
        <table className={`data-table ${s.platformTable}`} data-record-type="lead">
          <thead><tr><th scope="col">Contacto</th><th scope="col">Organización</th><th scope="col">Recibida</th><th scope="col">Detalles</th></tr></thead>
          <tbody>{filtered.map(lead => <tr key={lead.id}>
            <td className={s.platformIdentity}><strong>{lead.name}</strong><small>{lead.email}</small></td>
            <td>{lead.organization}</td>
            <td><time dateTime={lead.createdAt}>{date(lead.createdAt, true)}</time></td>
            <td><button type="button" className={s.quietAction} onClick={() => setSelected(lead)}>Detalles</button></td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState title="Sin solicitudes por ahora" description="Aquí aparecerán las solicitudes del sitio web."/>}
    </section>

    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Solicitud de ${selected.organization}` : 'Solicitud comercial'} description="Información registrada en el formulario del sitio web">
      {selected && <div className={s.leadDetail}>
        <LeadIdentity lead={selected}/>
        <dl className={s.detailGrid}>
          <DetailField label="Organización" value={selected.organization}/>
          <DetailField label="Persona de contacto" value={selected.name}/>
          <DetailField label="Correo" value={selected.email}/>
          <DetailField label="Recibida" value={date(selected.createdAt, true)}/>
        </dl>
        <div className={s.messageBlock}><h3>Mensaje</h3><p>{selected.message || 'No incluyó un mensaje adicional.'}</p></div>
        <div className="notice"><Icon name="mail"/><p>La solicitud está registrada. No se ha enviado ningún correo automático.</p></div>
        <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(selected.email); toast('Correo copiado.'); } catch { toast('No pudimos copiar el correo. Puedes seleccionarlo y copiarlo directamente.', 'error'); } }}>Copiar correo <Icon name="mail" size={16}/></Button>
      </div>}
    </Modal>
  </div>;
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return <div className={s.detailField}><dt>{label}</dt><dd>{value}</dd></div>;
}

function readCount(value: number | null) {
  return value === null ? 'Sin lectura' : number(value);
}

function licenseForTenant(licenses: License[] | null, tenantId: string) {
  return licenses?.find(license => license.tenantId === tenantId);
}

function tenantStatusLabel(status: string) {
  return status === 'ACTIVE' ? 'Activo' : status === 'TRIAL' ? 'En prueba' : status === 'SUSPENDED' ? 'Suspendido' : status;
}

function distributionByStatus(statuses: string[], labelFor: (status: string) => string) {
  const counts = statuses.reduce((result, status) => {
    result.set(status, (result.get(status) || 0) + 1);
    return result;
  }, new Map<string, number>());
  return Array.from(counts, ([status, value]) => ({ status, value }))
    .sort((left, right) => right.value - left.value || labelFor(left.status).localeCompare(labelFor(right.status), 'es-MX'))
    .map(({ status, value }, index) => ({ label: labelFor(status), value, color: comparisonPalette[index % comparisonPalette.length] }));
}

function distributionByOrganization(leads: Lead[]) {
  const counts = leads.reduce((result, lead) => {
    result.set(lead.organization, (result.get(lead.organization) || 0) + 1);
    return result;
  }, new Map<string, number>());
  const ranked = Array.from(counts, ([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'es-MX'));
  const top = ranked.slice(0, 4).map((item, index) => ({ ...item, color: comparisonPalette[index % comparisonPalette.length] }));
  const remaining = ranked.slice(4).reduce((sum, item) => sum + item.value, 0);
  return remaining > 0 ? [...top, { label: 'Otras organizaciones', value: remaining, color: comparisonPalette[4] }] : top;
}
