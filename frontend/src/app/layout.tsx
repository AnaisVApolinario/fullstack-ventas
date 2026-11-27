import type { Metadata } from 'next';
import './globals.css';
import Nav from './Nav';

export const metadata: Metadata = {
  title: 'Sistema de Ventas',
  description: 'Proyecto fullstack: Spring Boot + Next.js + PostgreSQL',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
