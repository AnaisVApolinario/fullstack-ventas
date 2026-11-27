'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSesion } from '@/lib/api';

// La raiz solo decide a donde ir: con sesion al punto de venta, sin sesion al login.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getSesion() ? '/ventas' : '/login');
  }, [router]);

  return null;
}
