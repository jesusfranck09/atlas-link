'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from './types';
const SESSION_KEY = 'atlas.session';
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as Session : null; } catch { return null; }
}
export function saveSession(session: Session | null) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); else sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('atlas-session'));
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getSession()?.token;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try { response = await fetch(`/api${path}`, { ...options, headers, cache: 'no-store' }); }
  catch (error) { if (error instanceof Error && error.name === 'AbortError') throw error; throw new ApiError(0, 'NETWORK', 'No pudimos conectar con Atlas Link. Revisa la conexión e inténtalo de nuevo.'); }
  if (!response.ok) {
    const body: {code?: string; message?: string} = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/auth/login') saveSession(null);
    throw new ApiError(response.status, body.code || 'REQUEST_FAILED', body.message || `No pudimos completar la solicitud (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const post = <T>(path: string, body: unknown, headers?: HeadersInit) => api<T>(path, { method: 'POST', body: JSON.stringify(body), headers });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export async function download(path: string, filename: string) {
  const response = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getSession()?.token || ''}` }, cache: 'no-store' });
  if (!response.ok) { const error: {message?: string} = await response.json().catch(() => ({})); throw new Error(error.message || 'No se pudo descargar el archivo.'); }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const sequence = useRef(0);
  const reload = useCallback(() => { setLoading(true); setRevision(x => x + 1); }, []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const current = ++sequence.current;
    api<T>(path, {signal: controller.signal}).then(value => { if (current === sequence.current) { setData(value); setError(null); } }).catch((err: unknown) => {
      if (err instanceof Error && err.name !== 'AbortError' && current === sequence.current) setError(err.message);
    }).finally(() => { if (current === sequence.current && !controller.signal.aborted) { setLoading(false); setLoadedPath(path); } });
    return () => controller.abort();
  }, [path, revision]);
  return { data: loadedPath === path ? data : null, setData, error: loadedPath === path ? error : null, loading: loading || loadedPath !== path, reload };
}
