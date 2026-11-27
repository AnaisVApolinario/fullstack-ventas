package com.portfolio.ventas.repository;

import com.portfolio.ventas.model.Venta;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VentaRepository extends JpaRepository<Venta, Long> {

    // Carga vendedor y detalles en una sola consulta (evita el problema N+1)
    @EntityGraph(attributePaths = {"vendedor", "detalles", "detalles.producto"})
    List<Venta> findAllByOrderByFechaDesc();
}
