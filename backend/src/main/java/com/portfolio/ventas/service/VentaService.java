package com.portfolio.ventas.service;

import com.portfolio.ventas.dto.Dtos.DetalleResponse;
import com.portfolio.ventas.dto.Dtos.ItemVenta;
import com.portfolio.ventas.dto.Dtos.VentaRequest;
import com.portfolio.ventas.dto.Dtos.VentaResponse;
import com.portfolio.ventas.model.DetalleVenta;
import com.portfolio.ventas.model.MetodoPago;
import com.portfolio.ventas.model.Producto;
import com.portfolio.ventas.model.Usuario;
import com.portfolio.ventas.model.Venta;
import com.portfolio.ventas.repository.ProductoRepository;
import com.portfolio.ventas.repository.UsuarioRepository;
import com.portfolio.ventas.repository.VentaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class VentaService {

    private final VentaRepository ventas;
    private final ProductoRepository productos;
    private final UsuarioRepository usuarios;

    public VentaService(VentaRepository ventas, ProductoRepository productos, UsuarioRepository usuarios) {
        this.ventas = ventas;
        this.productos = productos;
        this.usuarios = usuarios;
    }

    /**
     * Registra una venta: valida stock, descuenta inventario, calcula el total
     * y, si el pago es en efectivo, valida el monto recibido y calcula el vuelto.
     * Es transaccional: si algo falla, no se guarda nada.
     */
    @Transactional
    public VentaResponse registrar(VentaRequest req, String emailVendedor) {
        Usuario vendedor = usuarios.findByEmail(emailVendedor).orElseThrow();

        Venta venta = new Venta();
        venta.setVendedor(vendedor);
        BigDecimal total = BigDecimal.ZERO;

        for (ItemVenta item : req.items()) {
            Producto p = productos.findById(item.productoId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Producto no encontrado: " + item.productoId()));

            if (p.getStock() < item.cantidad()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Stock insuficiente para '" + p.getNombre() + "' (disponible: " + p.getStock() + ")");
            }

            p.setStock(p.getStock() - item.cantidad());

            DetalleVenta d = new DetalleVenta();
            d.setProducto(p);
            d.setCantidad(item.cantidad());
            d.setPrecioUnitario(p.getPrecio());
            venta.agregarDetalle(d);

            total = total.add(p.getPrecio().multiply(BigDecimal.valueOf(item.cantidad())));
        }

        venta.setTotal(total);
        venta.setMetodoPago(req.metodoPago());

        if (req.metodoPago() == MetodoPago.EFECTIVO) {
            BigDecimal recibido = req.montoRecibido();
            if (recibido == null || recibido.compareTo(total) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El monto recibido es menor al total de la venta");
            }
            venta.setMontoRecibido(recibido);
            venta.setVuelto(recibido.subtract(total));
        } else {
            // Tarjeta / Yape: se cobra el monto exacto, no hay vuelto
            venta.setMontoRecibido(total);
            venta.setVuelto(BigDecimal.ZERO);
        }

        return aRespuesta(ventas.save(venta));
    }

    @Transactional(readOnly = true)
    public List<VentaResponse> listar() {
        return ventas.findAllByOrderByFechaDesc().stream().map(this::aRespuesta).toList();
    }

    private VentaResponse aRespuesta(Venta v) {
        List<DetalleResponse> detalles = v.getDetalles().stream()
                .map(d -> new DetalleResponse(
                        d.getProducto().getId(),
                        d.getProducto().getNombre(),
                        d.getCantidad(),
                        d.getPrecioUnitario(),
                        d.getPrecioUnitario().multiply(BigDecimal.valueOf(d.getCantidad()))))
                .toList();
        return new VentaResponse(
                v.getId(),
                v.getFecha().toInstant(ZoneOffset.UTC),
                v.getTotal(),
                v.getVendedor().getNombre(),
                v.getMetodoPago() == null ? null : v.getMetodoPago().name(),
                v.getMontoRecibido(),
                v.getVuelto(),
                detalles);
    }
}
