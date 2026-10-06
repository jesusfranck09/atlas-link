import Link from 'next/link';
import { Brand } from '@/components/ui';
export default function NotFound() { return <main className="not-found"><Brand/><span className="eyebrow">Error 404</span><h1>Esta ruta aún no conecta.</h1><p>La página que buscas no está disponible.</p><Link href="/" className="btn btn-primary">Volver al inicio</Link></main>; }
