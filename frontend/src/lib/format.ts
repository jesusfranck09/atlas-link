import type { AccountStatus, Role } from './types';
export const money = (value: number | null | undefined) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(value || 0));
export const compactMoney = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
export const number = (value: number | null | undefined) => new Intl.NumberFormat('es-MX').format(Number(value || 0));
export function date(value?: string | null, time = false) {
  if (!value) return '—';
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00-06:00` : value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'America/Mexico_City' }).format(parsed);
}
export const roleLabel: Record<Role, string> = { PLATFORM_ADMIN: 'Administrador Atlas', HOSPITAL_ADMIN: 'Administrador del hospital', BILLING: 'Caja y facturación', REVIEWER: 'Auditor hospitalario', DIRECTOR: 'Dirección del hospital', INSURER_DEMO: 'Aseguradora · lectura' };
export const statusLabel: Record<AccountStatus, string> = { RECEIVED: 'Recibida', EVALUATED: 'Evaluada', IN_REVIEW: 'En revisión', READY: 'Lista para envío', SENT: 'Enviada', RESOLVED: 'Resultado registrado' };
export const laneLabel = { GREEN: 'Sin alertas', YELLOW: 'Revisión requerida', RED: 'Atención prioritaria' };
export const actionLabel: Record<string, string> = { ACCOUNT_CREATED: 'Cuenta recibida', ACCOUNT_EVALUATED: 'Evaluación completada', ACCOUNT_CLAIMED: 'Revisión asignada', LINE_UPDATED: 'Línea corregida', ACCOUNT_READY: 'Cuenta preparada', ACCOUNT_SENT: 'Envío registrado', OUTCOME_RECORDED: 'Resultado registrado', LOGIN: 'Inicio de sesión', AGREEMENT_CREATED: 'Convenio creado', AGREEMENT_PUBLISHED: 'Convenio publicado', USER_CREATED: 'Usuario creado', USER_UPDATED: 'Usuario actualizado', LICENSE_UPDATED: 'Licencia actualizada', TENANT_CREATED: 'Hospital registrado', ACCOUNT_EXPORTED: 'Cuenta exportada', ACCOUNT_VIEWED: 'Consulta de cuenta' };
const stateActions: Record<string, string> = { RECEIVED: 'Cuenta recibida', EVALUATED: 'Evaluación completada', IN_REVIEW: 'Revisión en curso', READY: 'Cuenta preparada', SENT: 'Envío registrado', RESOLVED: 'Resultado registrado', IMPORTED: 'Cuenta importada', CLAIMED: 'Revisión asignada', CORRECTED: 'Cargo corregido', EXPORTED: 'Cuenta exportada', LOGIN_SUCCESS: 'Inicio de sesión', LOGOUT: 'Cierre de sesión' };
export const actionText = (action: string) => actionLabel[action.toUpperCase()] || stateActions[action.toUpperCase()] || action.replaceAll('_', ' ').toLowerCase();
export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
