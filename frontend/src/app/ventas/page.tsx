'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, dinero, MetodoPago, Producto, Venta } from '@/lib/api';
import { useSesion } from '@/lib/useSesion';

const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: 'EFECTIVO', etiqueta: '💵 Efectivo' },
  { valor: 'TARJETA', etiqueta: '💳 Tarjeta' },
  { valor: 'YAPE', etiqueta: '📱 Yape' },
];

const BILLETES = [10, 20, 50, 100, 200];

// Redondeo a centimos para evitar errores de coma flotante (0.1 + 0.2)
const redondear = (n: number) => Math.round(n * 100) / 100;

export default function VentasPage() {
  const { listo } = useSesion();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [historial, setHistorial] = useState<Venta[]>([]);
  const [carrito, setCarrito] = useState<Record<number, number>>({}); // productoId -> cantidad
  const [busqueda, setBusqueda] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [recibido, setRecibido] = useState('');
  const [ticket, setTicket] = useState<Venta | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [p, v] = await Promise.all([api<Producto[]>('/productos'), api<Venta[]>('/ventas')]);
      setProductos(p);
      setHistorial(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    }
  }, []);

  useEffect(() => {
    if (listo) cargar();
  }, [listo, cargar]);

  const items = useMemo(
    () =>
      Object.entries(carrito)
        .map(([id, cantidad]) => ({ producto: productos.find((p) => p.id === Number(id)), cantidad }))
        .filter((i): i is { producto: Producto; cantidad: number } => !!i.producto),
    [carrito, productos]
  );

  const filtrados = useMemo(
    () => productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [productos, busqueda]
  );

  if (!listo) return null;

  const total = redondear(items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0));
  const totalVendido = historial.reduce((acc, v) => acc + v.total, 0);

  // Vuelto en vivo (solo efectivo)
  const recibidoNum = Number(recibido) || 0;
  const diferencia = redondear(recibidoNum - total); // >= 0 es vuelto; < 0 es lo que falta
  const efectivoOk = metodo !== 'EFECTIVO' || (recibido !== '' && diferencia >= 0);
  const puedeConfirmar = items.length > 0 && efectivoOk && !guardando;

  function agregar(p: Producto) {
    setTicket(null);
    setCarrito((c) => {
      const actual = c[p.id] ?? 0;
      if (actual >= p.stock) return c; // no se puede superar el stock
      return { ...c, [p.id]: actual + 1 };
    });
  }

  function quitar(id: number) {
    setCarrito((c) => {
      const copia = { ...c };
      if ((copia[id] ?? 0) <= 1) delete copia[id];
      else copia[id] -= 1;
      return copia;
    });
  }

  async function confirmar() {
    setError('');
    setGuardando(true);
    try {
      const cuerpo = {
        items: items.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
        metodoPago: metodo,
        ...(metodo === 'EFECTIVO' ? { montoRecibido: recibidoNum } : {}),
      };
      const venta = await api<Venta>('/ventas', { method: 'POST', body: JSON.stringify(cuerpo) });
      setTicket(venta);
      setCarrito({});
      setRecibido('');
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Punto de venta</h1>
          <p className="muted">Selecciona productos, elige cómo paga el cliente y confirma la venta.</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-icon indigo">🧾</span>
          <div>
            <span className="muted">Ventas realizadas</span>
            <strong>{historial.length}</strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon green">💰</span>
          <div>
            <span className="muted">Total vendido</span>
            <strong>{dinero(totalVendido)}</strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon amber">📦</span>
          <div>
            <span className="muted">Productos en catálogo</span>
            <strong>{productos.length}</strong>
          </div>
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}

      {ticket && (
        <div className="ticket">
          <div className="ticket-head">
            <strong>✅ Venta #{ticket.id} registrada</strong>
            <button className="secondary small" onClick={() => setTicket(null)}>
              Cerrar
            </button>
          </div>
          <div className="ticket-body">
            <div>
              <span className="muted">Total</span>
              <strong>{dinero(ticket.total)}</strong>
            </div>
            <div>
              <span className="muted">Pago</span>
              <strong>{ticket.metodoPago}</strong>
            </div>
            {ticket.metodoPago === 'EFECTIVO' && (
              <>
                <div>
                  <span className="muted">Recibido</span>
                  <strong>{dinero(ticket.montoRecibido ?? 0)}</strong>
                </div>
                <div className="ticket-vuelto">
                  <span>Vuelto a entregar</span>
                  <strong>{dinero(ticket.vuelto ?? 0)}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Productos</h3>
            <input
              className="search small"
              placeholder="🔍 Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <ul className="list">
            {filtrados.map((p) => {
              const enCarrito = carrito[p.id] ?? 0;
              return (
                <li key={p.id}>
                  <div>
                    <strong>{p.nombre}</strong>
                    <span className="muted">
                      {dinero(p.precio)} · stock {p.stock}
                    </span>
                  </div>
                  <button className="small" disabled={p.stock === 0 || enCarrito >= p.stock} onClick={() => agregar(p)}>
                    {p.stock === 0 ? 'Agotado' : '+ Agregar'}
                  </button>
                </li>
              );
            })}
            {filtrados.length === 0 && <li className="muted">Sin resultados.</li>}
          </ul>
        </div>

        <div className="card cart">
          <h3>🛒 Carrito</h3>
          {items.length === 0 ? (
            <p className="muted empty">Agrega productos para iniciar una venta.</p>
          ) : (
            <ul className="list">
              {items.map(({ producto, cantidad }) => (
                <li key={producto.id}>
                  <div>
                    <strong>{producto.nombre}</strong>
                    <span className="muted">
                      {cantidad} × {dinero(producto.precio)}
                    </span>
                  </div>
                  <div className="row">
                    <span className="price">{dinero(producto.precio * cantidad)}</span>
                    <button className="secondary small" onClick={() => quitar(producto.id)}>
                      −
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="cart-total">
            <span>Total</span>
            <strong>{dinero(total)}</strong>
          </div>

          <label>Método de pago</label>
          <div className="methods">
            {METODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                className={`method ${metodo === m.valor ? 'active' : ''}`}
                onClick={() => setMetodo(m.valor)}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>

          {metodo === 'EFECTIVO' && items.length > 0 && (
            <div className="cash">
              <label>Monto recibido (S/)</label>
              <input
                type="number"
                min="0"
                step="0.10"
                placeholder="0.00"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
              />
              <div className="quick">
                <button type="button" className="chip" onClick={() => setRecibido(total.toFixed(2))}>
                  Exacto
                </button>
                {BILLETES.map((b) => (
                  <button key={b} type="button" className="chip" onClick={() => setRecibido(String(b))}>
                    S/ {b}
                  </button>
                ))}
              </div>
              {recibido !== '' && (
                <div className={`change ${diferencia >= 0 ? 'ok' : 'bad'}`}>
                  {diferencia >= 0 ? (
                    <>
                      <span>Vuelto</span>
                      <strong>{dinero(diferencia)}</strong>
                    </>
                  ) : (
                    <>
                      <span>Falta</span>
                      <strong>{dinero(-diferencia)}</strong>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <button className="btn-full" disabled={!puedeConfirmar} onClick={confirmar}>
            {guardando ? 'Registrando...' : 'Confirmar venta'}
          </button>
        </div>
      </div>

      <div className="card table-card">
        <h3 style={{ padding: '1rem 1.2rem 0' }}>Historial de ventas</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Vendedor</th>
              <th>Detalle</th>
              <th>Pago</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className="badge violet">#{v.id}</span>
                </td>
                <td>{new Date(v.fecha).toLocaleString('es-PE')}</td>
                <td>{v.vendedor}</td>
                <td className="muted">{v.detalles.map((d) => `${d.productoNombre} ×${d.cantidad}`).join(', ')}</td>
                <td>
                  {v.metodoPago ? (
                    <span className={`badge ${v.metodoPago === 'EFECTIVO' ? 'green' : v.metodoPago === 'YAPE' ? 'violet' : 'blue'}`}>
                      {v.metodoPago}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="right price">{dinero(v.total)}</td>
              </tr>
            ))}
            {historial.length === 0 && (
              <tr>
                <td colSpan={6} className="muted center">
                  Aún no hay ventas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
