'use client';
import { ErrorState } from '@/components/ui';
import { Brand } from '@/components/ui';
import styles from './public-state.module.css';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}><Brand /></header>
        <section className={`${styles.panel} ${styles.errorPanel}`} aria-labelledby="error-title">
          <p className={styles.eyebrow}><span aria-hidden="true" /> Estado de la página</p>
          <h1 id="error-title" className={styles.title}>Una pausa en esta vista.</h1>
          <ErrorState message="Ocurrió un error al mostrar la página. Puedes intentar cargarla de nuevo." retry={reset} />
        </section>
      </div>
    </main>
  );
}
