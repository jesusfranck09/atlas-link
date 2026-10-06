'use client';

import type { ReactNode } from 'react';
import { Button, Icon, Modal } from './ui';
import s from './record-tools.module.css';

export function DetailsButton({ onClick, label, className = '' }: { onClick: () => void; label: string; className?: string }) {
  return <Button type="button" variant="ghost" className={`${s.detailsButton} ${className}`} onClick={onClick} aria-label={`Detalles de ${label}`}>
    <Icon name="file" size={15}/>Detalles
  </Button>;
}

export type DetailField = { label: string; value: ReactNode };

export function RecordDetailModal({
  open,
  onClose,
  title,
  description,
  fields,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: DetailField[];
  children?: ReactNode;
  wide?: boolean;
}) {
  return <Modal open={open} onClose={onClose} title={title} description={description} wide={wide}>
    <dl className={s.detailGrid}>{fields.map((field, index) => <div key={`${field.label}-${index}`}><dt>{field.label}</dt><dd>{field.value ?? '—'}</dd></div>)}</dl>
    {children}
  </Modal>;
}

