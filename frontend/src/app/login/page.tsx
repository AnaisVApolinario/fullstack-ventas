'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getSesion, guardarSesion, Sesion } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Si ya hay sesion no tiene sentido ver el login
  useEffect(() => {
    if (getSesion()) router.replace('/ventas');
  }, [router]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const ruta = modoRegistro ? '/auth/register' : '/auth/login';
      const cuerpo = modoRegistro ? { nombre, email, password } : { email, password };
      const sesion = await api<Sesion>(ruta, { method: 'POST', body: JSON.stringify(cuerpo) });
      guardarSesion(sesion);
      router.push('/ventas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  function usarDemo(correo: string, clave: string) {
    setModoRegistro(false);
    setEmail(correo);
    setPassword(clave);
    setError('');
  }

  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="auth-hero-content">
          <span className="brand-logo big">🛒</span>
          <h1>Sistema de Ventas</h1>
          <p>Gestiona tu inventario y registra ventas en segundos, con control de acceso por roles.</p>
          <ul>
            <li>📦 Catálogo e inventario en tiempo real</li>
            <li>🧾 Punto de venta con carrito</li>
            <li>🔐 Acceso seguro con JWT y roles</li>
          </ul>
        </div>
      </section>

      <section className="auth-form">
        <div className="auth-box">
          <h2>{modoRegistro ? 'Crear cuenta' : 'Bienvenido de nuevo'}</h2>
          <p className="muted">
            {modoRegistro ? 'Regístrate para empezar a vender.' : 'Ingresa tus credenciales para continuar.'}
          </p>

          <form onSubmit={enviar}>
            {modoRegistro && (
              <>
                <label>Nombre</label>
                <input placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </>
            )}
            <label>Email</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="alert error">{error}</p>}
            <button type="submit" className="btn-full" disabled={cargando}>
              {cargando ? 'Enviando...' : modoRegistro ? 'Registrarme' : 'Entrar'}
            </button>
          </form>

          <p className="muted center">
            {modoRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setModoRegistro(!modoRegistro);
                setError('');
              }}
            >
              {modoRegistro ? 'Inicia sesión' : 'Regístrate'}
            </a>
          </p>

          {!modoRegistro && (
            <div className="demo">
              <span className="muted">Cuentas de demo (clic para rellenar)</span>
              <div className="demo-buttons">
                <button type="button" className="chip" onClick={() => usarDemo('admin@demo.com', 'admin123')}>
                  👑 Admin
                </button>
                <button type="button" className="chip" onClick={() => usarDemo('vendedor@demo.com', 'vendedor123')}>
                  🧑‍💼 Vendedor
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
