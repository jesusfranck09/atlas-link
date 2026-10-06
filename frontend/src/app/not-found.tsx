import Link from 'next/link';
import { Brand } from '@/components/ui';
import styles from './public-state.module.css';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}><Brand /></header>
        <section className={`${styles.panel} ${styles.notFoundPanel}`} aria-labelledby="not-found-title">
          <p className={styles.eyebrow}><span aria-hidden="true" /> Error 404</p>
          <h1 id="not-found-title" className={styles.title}>Esta ruta aún no conecta.</h1>
          <p className={styles.description}>La página que buscas no está disponible.</p>
          <Link href="/" className={`btn btn-primary ${styles.action}`}>Volver al inicio</Link>
        </section>
      </div>
    </main>
  );
}
