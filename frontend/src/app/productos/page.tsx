'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, dinero, Producto } from '@/lib/api';
import { useSesion } from '@/lib/useSesion';

function BadgeStock({ stock }: { stock: number }) {
  if (stock === 0) return <span className="badge red">Agotado</span>;
  if (stock <= 10) return <span className="badge amber">{stock} · Poco stock</span>;
  return <span className="badge green">{stock} disponibles</span>;
}

export default function ProductosPage() {
  const { sesion, listo } = useSesion();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  // formulario (solo ADMIN)
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');

  const cargar = useCallback(async () => {
    try {
      setProductos(await api<Producto[]>('/productos'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
    }
  }, []);

  useEffect(() => {
    if (listo) cargar();
  }, [listo, cargar]);

  const filtrados = useMemo(
    () => productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [productos, busqueda]
  );

  if (!listo) return null;
  const esAdmin = sesion?.role === 'ADMIN';

  function limpiar() {
    setEditandoId(null);
    setNombre('');
    setPrecio('');
    setStock('');
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError('');
    const cuerpo = JSON.stringify({ nombre, precio: Number(precio), stock: Number(stock) });
    try {
      if (editandoId) {
        await api(`/productos/${editandoId}`, { method: 'PUT', body: cuerpo });
      } else {
        await api('/productos', { method: 'POST', body: cuerpo });
      }
      limpiar();
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  function editar(p: Producto) {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecio(String(p.precio));
    setStock(String(p.stock));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este producto?')) return;
    setError('');
    try {
      await api(`/productos/${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar (¿tiene ventas asociadas?)');
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Productos</h1>
          <p className="muted">
            {productos.length} productos en el catálogo
            {!esAdmin && ' · solo lectura (únicamente el administrador puede editar)'}
          </p>
        </div>
        <input
          className="search"
          placeholder="🔍 Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <p className="alert error">{error}</p>}

      {esAdmin && (
        <form className="card form-card" onSubmit={guardar}>
          <h3>{editandoId ? '✏️ Editar producto' : '➕ Nuevo producto'}</h3>
          <div className="form-row">
            <div className="grow">
              <label>Nombre</label>
              <input placeholder="Ej. Teclado mecánico" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div>
              <label>Precio (S/)</label>
              <input type="number" step="0.01" min="0" placeholder="0.00" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
            </div>
            <div>
              <label>Stock</label>
              <input type="number" min="0" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
            </div>
          </div>
          <div className="row">
            <button type="submit">{editandoId ? 'Actualizar' : 'Crear producto'}</button>
            {editandoId && (
              <button type="button" className="secondary" onClick={limpiar}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="right">Precio</th>
              <th>Stock</th>
              {esAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.nombre}</strong>
                </td>
                <td className="right price">{dinero(p.precio)}</td>
                <td>
                  <BadgeStock stock={p.stock} />
                </td>
                {esAdmin && (
                  <td className="right">
                    <div className="row end">
                      <button className="secondary small" onClick={() => editar(p)}>
                        Editar
                      </button>
                      <button className="danger small" onClick={() => eliminar(p.id)}>
                        Borrar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="muted center">
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
