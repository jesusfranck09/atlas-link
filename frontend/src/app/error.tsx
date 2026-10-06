'use client';
import { ErrorState } from '@/components/ui';
export default function ErrorPage({reset}: {error: Error & {digest?: string}; reset: () => void}) { return <main className="container py-24"><ErrorState message="Ocurrió un error al mostrar la página. Puedes intentar cargarla de nuevo." retry={reset}/></main>; }
