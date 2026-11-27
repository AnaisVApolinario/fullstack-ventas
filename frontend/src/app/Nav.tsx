'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cerrarSesion, getSesion, Sesion } from '@/lib/api';

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [sesion, setSesion] = useState<Sesion | null>(null);

  // Se vuelve a leer la sesion en cada cambio de ruta (login, logout, etc.)
  useEffect(() => {
    setSesion(getSesion());
  }, [pathname]);

  // Sin sesion (o en el login) no se muestra la barra de navegacion
  if (!sesion || pathname === '/login') return null;

  function salir() {
    cerrarSesion();
    setSesion(null);
    router.push('/login');
  }

  const activo = (ruta: string) => (pathname.startsWith(ruta) ? 'active' : '');

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/ventas" className="brand">
          <span className="brand-logo">🛒</span> Sistema de Ventas
        </Link>

        <nav className="nav-links">
          <Link href="/ventas" className={activo('/ventas')}>
            Punto de venta
          </Link>
          <Link href="/productos" className={activo('/productos')}>
            Productos
          </Link>
        </nav>

        <div className="nav-user">
          <span className="avatar">{sesion.nombre.charAt(0).toUpperCase()}</span>
          <div className="nav-user-info">
            <strong>{sesion.nombre}</strong>
            <span className={`badge ${sesion.role === 'ADMIN' ? 'violet' : 'blue'}`}>{sesion.role}</span>
          </div>
          <button className="btn-ghost" onClick={salir}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
