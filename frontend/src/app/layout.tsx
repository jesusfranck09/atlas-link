import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:4300'),
  title: {default: 'Atlas Link — Claridad para cada cuenta hospitalaria', template: '%s | Atlas Link'},
  description: 'Una nueva perspectiva para la preauditoría hospitalaria. Conecta cuentas, convenios y equipos en una plataforma diseñada para avanzar con claridad.',
  applicationName: 'Atlas Link',
  icons: {icon: [{url: '/favicon.svg', type: 'image/svg+xml'}]},
  openGraph: {title: 'Atlas Link — Claridad que conecta', description: 'Cuentas, convenios y personas. Una visión conectada para la preauditoría hospitalaria.', locale: 'es_MX', type: 'website', images: [{url: '/brand/atlas-link-social.svg', width: 1200, height: 630, alt: 'Atlas Link. Claridad que conecta.'}]},
  robots: {index: false, follow: false},
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="es-MX" data-scroll-behavior="smooth"><body><ToastProvider>{children}</ToastProvider></body></html>; }
