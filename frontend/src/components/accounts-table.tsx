'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useResource } from '@/lib/api';
import { date, money } from '@/lib/format';
import type { Account, AccountDetail as AccountDetailRecord } from '@/lib/types';
import { Badge, Button, EmptyState, ErrorState, Icon, Loading, Modal } from './ui';
import s from './operations.module.css';

function AccountFacts({ account }: { account: AccountDetailRecord }) {
  return <dl className={s.accountModalFacts}>
    <div><dt>Paciente</dt><dd>{account.patientReference || 'Sin referencia'}</dd></div>
    <div><dt>Aseguradora</dt><dd>{account.insurer}</dd></div>
    <div><dt>Ingreso</dt><dd>{date(account.admissionDate)}</dd></div>
    <div><dt>Egreso</dt><dd>{date(account.dischargeDate)}</dd></div>
    <div><dt>Póliza</dt><dd>{account.policyNumber || 'Sin información'}</dd></div>
    <div><dt>Diagnóstico CIE-10</dt><dd>{account.diagnosis || 'Sin información'}</dd></div>
    <div><dt>Preauditoría</dt><dd><Badge lane={account.lane}/></dd></div>
    <div><dt>Estado</dt><dd><Badge status={account.status}/></dd></div>
    <div><dt>Importe</dt><dd>{money(account.total)}</dd></div>
    <div><dt>Cargos</dt><dd>{account.lines.length}</dd></div>
    <div><dt>Hallazgos</dt><dd>{account.anomalyCount}</dd></div>
    <div><dt>Recibida</dt><dd>{date(account.createdAt, true)}</dd></div>
  </dl>;
}

export default function AccountsTable({ accounts, compact = false }: { accounts: Account[]; compact?: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAccount = accounts.find(account => account.id === selectedId);
  const detail = useResource<AccountDetailRecord>(selectedId ? `/accounts/${selectedId}` : null);

  if (!accounts.length) return <EmptyState title="No hay cuentas en esta vista" description="Prueba con otros filtros o carga una cuenta para comenzar."/>;

  return <>
    <div className={s.accountTableRegion} tabIndex={0} role="region" aria-label="Tabla de cuentas hospitalarias">
      <table className={`${s.accountTable} ${compact ? s.compactTable : ''}`}>
        <thead><tr>
          <th scope="col">Cuenta / paciente</th>
          <th scope="col" className={s.insurerColumn}>Aseguradora</th>
          <th scope="col" className={`${s.amountHeading} ${s.amountColumn}`}>Importe</th>
          <th scope="col" className={s.preAuditColumn}>Preauditoría</th>
          {!compact && <th scope="col">Estado</th>}
          <th scope="col" className={s.detailsColumn}>Detalles</th>
          <th scope="col" className={s.openColumn}><span className="sr-only">Abrir cuenta</span></th>
        </tr></thead>
        <tbody>{accounts.map(account => <tr key={account.id}>
          <td><span className={s.accountIdentity}>
            <span className={s.accountDocument} data-lane={account.lane}><Icon name="file" size={17}/></span>
            <span><strong>{account.folio}</strong><small><span className={s.patientReference}>{account.patientReference}</span><time className={s.accountDate} dateTime={account.createdAt}>{date(account.createdAt)}</time><span className={s.mobileAmount}>{money(account.total)}</span></small></span>
          </span></td>
          <td className={s.insurerColumn}><span className={s.insurerCell}>{account.insurer}</span></td>
          <td className={`${s.amountCell} ${s.amountColumn}`}>{money(account.total)}</td>
          <td className={s.preAuditColumn}><span className={s.preAuditCell}><Badge lane={account.lane}/>{account.anomalyCount > 0 && <small className={s.findings}>{account.anomalyCount === 1 ? '1 hallazgo' : `${account.anomalyCount} hallazgos`}</small>}</span></td>
          {!compact && <td><Badge status={account.status}/></td>}
          <td className={s.detailsColumn}><Button variant="secondary" className={s.accountDetailsButton} onClick={() => setSelectedId(account.id)} aria-label={`Detalles de la cuenta ${account.folio}`}>Detalles</Button></td>
          <td className={s.openColumn}><Link href={`/hospital/accounts/${account.id}`} className={s.tableOpen} aria-label={`Abrir cuenta ${account.folio}`}><Icon name="arrow" size={17}/><span className={s.openAccountLabel}>Abrir cuenta</span></Link></td>
        </tr>)}</tbody>
      </table>
    </div>
    <Modal open={Boolean(selectedId)} onClose={() => setSelectedId(null)} title={selectedAccount?.folio || 'Detalles de la cuenta'} description="Resumen de solo lectura · La cuenta completa se abre en su expediente." wide>
      {detail.loading ? <Loading label="Consultando la cuenta"/> : detail.error ? <ErrorState message={detail.error} retry={detail.reload}/> : detail.data && <>
        <div className={s.accountModalHero}><div><span>EXPEDIENTE</span><strong>{detail.data.folio}</strong></div><span className={s.accountModalTotal}>{money(detail.data.total)}</span></div>
        <AccountFacts account={detail.data}/>
        <div className={s.accountModalActions}><span>{detail.data.assignedTo ? 'Asignada para revisión' : 'Sin asignar'}</span><Link className="btn btn-primary" href={`/hospital/accounts/${detail.data.id}`} onClick={() => setSelectedId(null)}>Abrir cuenta <Icon name="arrow" size={16}/></Link></div>
      </>}
    </Modal>
  </>;
}
