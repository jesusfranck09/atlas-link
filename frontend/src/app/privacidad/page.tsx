import Link from 'next/link';
import { Brand } from '@/components/ui';
import styles from './privacidad.module.css';

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Brand />
          <span className={styles.headerNote}>Información del producto</span>
        </header>

        <section className={styles.intro} aria-labelledby="privacy-title">
          <p className={styles.eyebrow}><span aria-hidden="true" /> Entorno de demostración</p>
          <h1 id="privacy-title">Tu información,<br /><span>con claridad.</span></h1>
          <p className={styles.summary}>Esta versión de Atlas Link es una demostración de producto. Las cuentas hospitalarias, las aseguradoras y los convenios del entorno son sintéticos. No introduzcas datos de pacientes reales.</p>
        </section>

        <div className={styles.sections}>
          <section className={styles.policySection} aria-labelledby="contact-title">
            <span className={styles.sectionNumber}>01</span>
            <div>
              <h2 id="contact-title">Solicitudes de contacto</h2>
              <p>El formulario registra tu nombre, correo, organización y mensaje para atender el interés en el producto. En este entorno, la información permanece en la instalación local y no se envía a un proveedor de correo ni a una plataforma comercial externa.</p>
            </div>
          </section>

          <section className={styles.policySection} aria-labelledby="storage-title">
            <span className={styles.sectionNumber}>02</span>
            <div>
              <h2 id="storage-title">Almacenamiento del navegador</h2>
              <p>Al iniciar sesión se conserva temporalmente la sesión en esta pestaña del navegador. Puedes eliminarla usando «Cerrar sesión». No utilizamos analítica publicitaria ni cookies de seguimiento.</p>
            </div>
          </section>

          <section className={styles.policySection} aria-labelledby="commercial-title">
            <span className={styles.sectionNumber}>03</span>
            <div>
              <h2 id="commercial-title">Antes de una operación comercial</h2>
              <p>La empresa operadora debe publicar sus datos de identidad y contacto, el aviso de privacidad definitivo, las condiciones del servicio y los mecanismos para ejercer derechos. La carga de información clínica real no está habilitada como alcance validado de esta demostración.</p>
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <span>Atlas Link · demostración con datos sintéticos</span>
          <Link href="/" className={styles.returnLink}>Volver a Atlas Link <span aria-hidden="true">↗</span></Link>
        </footer>
      </div>
    </main>
  );
}
