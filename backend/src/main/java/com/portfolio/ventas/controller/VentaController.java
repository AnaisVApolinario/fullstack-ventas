package com.portfolio.ventas.controller;

import com.portfolio.ventas.dto.Dtos.VentaRequest;
import com.portfolio.ventas.dto.Dtos.VentaResponse;
import com.portfolio.ventas.service.VentaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    private final VentaService service;

    public VentaController(VentaService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VentaResponse registrar(@Valid @RequestBody VentaRequest req, Authentication auth) {
        return service.registrar(req, auth.getName());
    }

    @GetMapping
    public List<VentaResponse> listar() {
        return service.listar();
    }
}
