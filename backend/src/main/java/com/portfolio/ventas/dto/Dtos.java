package com.portfolio.ventas.dto;

import com.portfolio.ventas.model.MetodoPago;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class Dtos {

    private Dtos() {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}

    public record RegisterRequest(
            @NotBlank String nombre,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres") String password) {}

    public record AuthResponse(String token, String nombre, String email, String role) {}

    public record ItemVenta(
            @NotNull Long productoId,
            @Min(1) int cantidad) {}

    /** montoRecibido solo es obligatorio cuando el pago es en EFECTIVO. */
    public record VentaRequest(
            @NotEmpty @Valid List<ItemVenta> items,
            @NotNull MetodoPago metodoPago,
            @DecimalMin("0.0") BigDecimal montoRecibido) {}

    // Respuestas de ventas: se devuelven DTOs y no las entidades JPA, para no
    // exponer datos internos (como el hash de la contraseña del vendedor) ni
    // fallar al serializar relaciones lazy.
    public record DetalleResponse(
            Long productoId,
            String productoNombre,
            int cantidad,
            BigDecimal precioUnitario,
            BigDecimal subtotal) {}

    // fecha como Instant: se serializa en UTC con "Z" (p. ej. 2026-11-27T03:03:54Z)
    public record VentaResponse(
            Long id,
            Instant fecha,
            BigDecimal total,
            String vendedor,
            String metodoPago,
            BigDecimal montoRecibido,
            BigDecimal vuelto,
            List<DetalleResponse> detalles) {}

    public record ErrorResponse(String mensaje) {}
}
