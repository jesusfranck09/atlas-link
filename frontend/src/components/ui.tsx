'use client';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { AccountStatus, Lane } from '@/lib/types';
import { laneLabel, statusLabel } from '@/lib/format';

const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6', chevron: 'm9 5 7 7-7 7', down: 'm6 9 6 6 6-6',
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  accounts: 'M7 3h10l3 3v15H4V3zm9 0v5h4M8 12h8M8 16h5',
  review: 'M9 3H5v18h14v-6M9 3v4h6V3zm3 10 3 3 6-7',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  download: 'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7zm-4 9 3 3 5-6',
  chart: 'M4 3v18h17M8 16v-4m5 4V8m5 8V5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m7 .13a4 4 0 0 1 0 7.75',
  building: 'M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-3h4v3',
  key: 'M14 3a7 7 0 0 0-5.5 11.3L3 20v1h4v-3h3v-3l.7-.5A7 7 0 1 0 14 3m2 5h.01',
  search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M16 16l5 5',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M6 18 18 6', check: 'm5 12 4 4L19 6',
  alert: 'm12 3 10 18H2zm0 6v5m0 3h.01', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 4v5l3 2',
  logout: 'M9 4H3v16h6m5-13 5 5-5 5m-7-5h12', menu: 'M4 6h16M4 12h16M4 18h16',
  mail: 'M3 5h18v14H3zm0 1 9 7 9-7', lock: 'M5 10h14v11H5zm3 0V6a4 4 0 0 1 8 0v4m-4 5v2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 0c5 5 5 13 0 18-5-5-5-13 0-18M3 12h18',
  layers: 'm12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 17l10 5 10-5',
  link: 'm10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zm7-2v4m-2-2h4',
  arrowUp: 'm5 16 6-6 4 4 6-9m-6 0h6v6', refresh: 'M20 7V2m0 5h-5M4 17v5m0-5h5M4.9 7a8 8 0 0 1 13.2-2L20 7M4 17l1.9 2A8 8 0 0 0 19.1 17',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m-3 6a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z', edit: 'm14 5 5 5M3 21l5-1L21 7l-4-4L4 16z',
  file: 'M6 3h8l5 5v13H5V3zm8 0v6h5M8 13h8M8 17h6',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
} as const;
export type IconName = keyof typeof paths;
export function Icon({name, size = 20, className = ''}: {name: IconName; size?: number; className?: string}) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
export function Brand({small = false, white = false}: {small?: boolean; white?: boolean}) {
  return <Link href="/" className={`brand ${small ? 'brand-small' : ''} ${white ? 'brand-white' : ''}`} aria-label="Atlas Link, inicio"><span className="brand-mark"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 25 19 6h10L18 25H8Z" fill="currentColor"/><path d="m21 26 11-19 11 19h-10l-6-10" fill="currentColor" opacity=".55"/><path d="M8 29h21l11 13H18L8 29Z" fill="currentColor" opacity=".82"/></svg></span><span className="brand-wordmark">atlas<span className="brand-light">link</span><span className="brand-dot">.</span></span></Link>;
}
export function Button({children, variant = 'primary', loading = false, className = '', ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean}) {
  return <button {...props} disabled={props.disabled || loading} className={`btn btn-${variant} ${className}`} aria-busy={loading}>{loading && <span className="spinner"/>}{children}</button>;
}
export function Badge({lane, status, children}: {lane?: Lane; status?: AccountStatus; children?: ReactNode}) {
  const kind = lane ? lane.toLowerCase() : status === 'READY' || status === 'RESOLVED' ? 'green' : status === 'IN_REVIEW' ? 'yellow' : 'neutral';
  return <span className={`badge badge-${kind}`}>{lane && <span className="badge-dot"/>}{children || (lane ? laneLabel[lane] : status ? statusLabel[status] : '')}</span>;
}
export function Field({label, children, hint, required, className = ''}: {label: string; children: ReactNode; hint?: string; required?: boolean; className?: string}) {
  return <label className={`field ${className}`}><span>{label}{required && <span className="required"> *</span>}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function EmptyState({title = 'Aún no hay registros', description = 'Los nuevos registros aparecerán aquí.', action}: {title?: string; description?: string; action?: ReactNode}) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="layers" size={28}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function ErrorState({message, retry}: {message: string; retry?: () => void}) {
  return <div className="error-state" role="alert"><Icon name="alert"/><div><strong>No pudimos cargar esta información</strong><p>{message}</p></div>{retry && <Button variant="secondary" onClick={retry}><Icon name="refresh" size={16}/> Reintentar</Button>}</div>;
}
export function Loading({label = 'Cargando información'}: {label?: string}) {
  return <div className="loading-state" role="status"><span className="spinner"/><span>{label}…</span></div>;
}
export function PageTitle({eyebrow, title, description, children}: {eyebrow?: string; title: string; description?: string; children?: ReactNode}) {
  return <div className="page-heading"><div className="page-heading-copy">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="page-actions">{children}</div>}</div>;
}
export function Modal({open, onClose, title, description, children, wide = false}: {open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close(); }, [open]);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }} aria-labelledby={titleId}><div className="modal-inner"><header><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="close"/></button></header>{children}</div></dialog>;
}
const ToastContext = createContext<(message: string, kind?: 'success' | 'error') => void>(() => undefined);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({children}: {children: ReactNode}) {
  const [toast, setToast] = useState<{message: string; kind: 'success' | 'error'} | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, kind: 'success' | 'error' = 'success') => { setToast({message, kind}); if(timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 5500); }, []);
  useEffect(() => () => { if(timer.current) clearTimeout(timer.current); }, []);
  return <ToastContext.Provider value={show}>{children}<div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className={`toast toast-${toast.kind}`}><Icon name={toast.kind === 'success' ? 'check' : 'alert'}/><span>{toast.message}</span><button className="icon-button" onClick={() => setToast(null)} aria-label="Cerrar aviso"><Icon name="close" size={16}/></button></div>}</div></ToastContext.Provider>;
}
