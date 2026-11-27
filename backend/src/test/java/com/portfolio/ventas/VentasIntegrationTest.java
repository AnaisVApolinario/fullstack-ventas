package com.portfolio.ventas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.ventas.model.Producto;
import com.portfolio.ventas.repository.ProductoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VentasIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProductoRepository productos;

    private String registrarYObtenerToken(String email) throws Exception {
        String body = """
                {"nombre":"Test","email":"%s","password":"secreto123"}""".formatted(email);
        String res = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(res);
        return node.get("token").asText();
    }

    /** Arma el JSON de una venta de un solo producto. extra = campos de pago adicionales. */
    private String venta(Long productoId, int cantidad, String pago) {
        return "{\"items\":[{\"productoId\":" + productoId + ",\"cantidad\":" + cantidad + "}]," + pago + "}";
    }

    @Test
    void productosSinTokenDevuelve401() throws Exception {
        mvc.perform(get("/api/productos")).andExpect(status().isUnauthorized());
    }

    @Test
    void productosConTokenDevuelve200() throws Exception {
        String token = registrarYObtenerToken("vend0@test.com");
        mvc.perform(get("/api/productos").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void ventasSinTokenDevuelve401() throws Exception {
        mvc.perform(post("/api/ventas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(venta(1L, 1, "\"metodoPago\":\"TARJETA\"")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginConCredencialesIncorrectasDevuelve401() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nadie@test.com\",\"password\":\"mal\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void vendedorNoPuedeCrearProductos() throws Exception {
        String token = registrarYObtenerToken("vend1@test.com");
        mvc.perform(post("/api/productos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"X\",\"precio\":10,\"stock\":5}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void ventaConTarjetaDescuentaStockYCalculaTotal() throws Exception {
        Producto p = productos.save(new Producto("Producto test", new BigDecimal("10.50"), 10));
        String token = registrarYObtenerToken("vend2@test.com");

        mvc.perform(post("/api/ventas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(venta(p.getId(), 3, "\"metodoPago\":\"TARJETA\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(31.5))
                .andExpect(jsonPath("$.metodoPago").value("TARJETA"))
                .andExpect(jsonPath("$.vuelto").value(0));

        assertEquals(7, productos.findById(p.getId()).orElseThrow().getStock());
    }

    @Test
    void ventaConStockInsuficienteDevuelve400() throws Exception {
        Producto p = productos.save(new Producto("Poco stock", new BigDecimal("5.00"), 2));
        String token = registrarYObtenerToken("vend3@test.com");

        mvc.perform(post("/api/ventas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(venta(p.getId(), 5, "\"metodoPago\":\"TARJETA\"")))
                .andExpect(status().isBadRequest());

        assertEquals(2, productos.findById(p.getId()).orElseThrow().getStock());
    }

    /** Regresion: listar ventas despues de vender fallaba al serializar y cerraba la sesion. */
    @Test
    void listarVentasDespuesDeVenderDevuelve200SinExponerPassword() throws Exception {
        Producto p = productos.save(new Producto("Para historial", new BigDecimal("20.00"), 5));
        String token = registrarYObtenerToken("vend4@test.com");

        mvc.perform(post("/api/ventas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(venta(p.getId(), 1, "\"metodoPago\":\"YAPE\"")))
                .andExpect(status().isCreated());

        String body = mvc.perform(get("/api/ventas").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].vendedor").isNotEmpty())
                .andExpect(jsonPath("$[0].detalles[0].productoNombre").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        assertEquals(false, body.contains("password"));
    }

    @Test
    void ventaEnEfectivoCalculaElVuelto() throws Exception {
        Producto p = productos.save(new Producto("Producto efectivo", new BigDecimal("10.50"), 10));
        String token = registrarYObtenerToken("vend5@test.com");

        mvc.perform(post("/api/ventas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(venta(p.getId(), 3, "\"metodoPago\":\"EFECTIVO\",\"montoRecibido\":50")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(31.5))
                .andExpect(jsonPath("$.montoRecibido").value(50))
                .andExpect(jsonPath("$.vuelto").value(18.5));
    }

    @Test
    void efectivoInsuficienteDevuelve400YNoDescuentaStock() throws Exception {
        Producto p = productos.save(new Producto("Producto caro", new BigDecimal("40.00"), 5));
        String token = registrarYObtenerToken("vend6@test.com");

        mvc.perform(post("/api/ventas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(venta(p.getId(), 1, "\"metodoPago\":\"EFECTIVO\",\"montoRecibido\":20")))
                .andExpect(status().isBadRequest());

        // la transaccion se revierte: el stock queda intacto
        assertEquals(5, productos.findById(p.getId()).orElseThrow().getStock());
    }

    @Test
    void ventaSinMetodoDePagoDevuelve400() throws Exception {
        Producto p = productos.save(new Producto("Sin pago", new BigDecimal("5.00"), 5));
        String token = registrarYObtenerToken("vend7@test.com");

        mvc.perform(post("/api/ventas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"productoId\":" + p.getId() + ",\"cantidad\":1}]}"))
                .andExpect(status().isBadRequest());
    }
}
