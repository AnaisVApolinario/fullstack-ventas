// Cliente minimo para hablar con la API de Spring Boot.
// El token JWT se guarda en localStorage y se envia en cada peticion.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export type Role = 'ADMIN' | 'VENDEDOR';

export interface Sesion {
  token: string;
  nombre: string;
  email: string;
  role: Role;
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
}

export interface DetalleVenta {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE';

export interface Venta {
  id: number;
  fecha: string; // ISO en UTC (termina en Z); el navegador la muestra en hora local
  total: number;
  vendedor: string;
  metodoPago: MetodoPago | null; // null en ventas anteriores a esta funcionalidad
  montoRecibido: number | null;
  vuelto: number | null;
  detalles: DetalleVenta[];
}

const CLAVE = 'sesion';

export function getSesion(): Sesion | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(s: Sesion) {
  localStorage.setItem(CLAVE, JSON.stringify(s));
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE);
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const sesion = getSesion();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sesion) headers['Authorization'] = `Bearer ${sesion.token}`;

  const res = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: { ...headers, ...(opciones.headers as Record<string, string>) },
  });

  if (res.status === 401 && sesion) {
    // token vencido o invalido: se cierra la sesion
    cerrarSesion();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.mensaje) mensaje = data.mensaje;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(mensaje);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const dinero = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
