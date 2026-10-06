import type { Metadata } from 'next';
import Login from '@/components/login';

export const metadata: Metadata = { title: 'Aseguradora · Acceso demo' };

export default function InsurerLogin() {
  return <Login insurer/>;
}
