'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSesion, Sesion } from './api';

/**
 * Protege una pagina: si no hay sesion redirige a /login.
 * `listo` pasa a true cuando ya se verifico la sesion (evita mostrar
 * contenido protegido por un instante antes de redirigir).
 */
export function useSesion() {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const s = getSesion();
    if (!s) {
      router.replace('/login');
      return;
    }
    setSesion(s);
    setListo(true);
  }, [router]);

  return { sesion, listo };
}
