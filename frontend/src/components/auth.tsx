'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api, getSession, post, saveSession } from '@/lib/api';
import type { Role, User } from '@/lib/types';
import { EmptyState, ErrorState, Loading } from './ui';

const AuthContext = createContext<User | null>(null);
export function useUser() { const user = useContext(AuthContext); if (!user) throw new Error('Sesión requerida'); return user; }
export function RoleGate({roles, children}: {roles: Role[]; children: ReactNode}) { const user = useUser(); return roles.includes(user.role) ? children : <EmptyState title="Esta función corresponde a otro perfil" description="Tu cuenta conserva acceso a las herramientas de tu rol. Utiliza el menú para continuar."/>; }
export function AuthBoundary({children, platform = false}: {children: ReactNode; platform?: boolean}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const check = () => { if (!getSession()) router.replace(platform ? '/admin/login' : '/login'); };
    const session = getSession();
    if (!session) { check(); return; }
    const controller = new AbortController();
    api<User>('/auth/me', {signal: controller.signal}).then(current => {
      if ((current.role === 'PLATFORM_ADMIN') !== platform) { router.replace(current.role === 'PLATFORM_ADMIN' ? '/admin' : '/hospital'); return; }
      setUser(current);
    }).catch((cause: unknown) => { if (cause instanceof Error && cause.name !== 'AbortError') { if (cause instanceof ApiError && cause.status === 401) { saveSession(null); router.replace(platform ? '/admin/login' : '/login'); } else setError(cause.message); } });
    window.addEventListener('atlas-session', check);
    return () => { controller.abort(); window.removeEventListener('atlas-session', check); };
  }, [platform, router, revision]);
  return user ? <AuthContext.Provider value={user}>{children}</AuthContext.Provider> : <div className="auth-loading">{error ? <ErrorState message={error} retry={() => {setError('');setRevision(value => value + 1);}}/> : <Loading label="Verificando tu acceso"/>}</div>;
}
export async function logout() { try { await post('/auth/logout', {}); } finally { saveSession(null); } }
