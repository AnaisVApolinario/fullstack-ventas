package com.portfolio.ventas.config;

import com.portfolio.ventas.model.Producto;
import com.portfolio.ventas.model.Role;
import com.portfolio.ventas.model.Usuario;
import com.portfolio.ventas.repository.ProductoRepository;
import com.portfolio.ventas.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;

/**
 * Datos de demo para poder probar el sistema al instante.
 * Solo se ejecuta fuera del perfil "test".
 */
@Configuration
@Profile("!test")
public class DataSeeder {

    @Bean
    CommandLineRunner seed(UsuarioRepository usuarios, ProductoRepository productos, PasswordEncoder encoder) {
        return args -> {
            if (usuarios.count() == 0) {
                usuarios.save(new Usuario("Administrador", "admin@demo.com", encoder.encode("admin123"), Role.ADMIN));
                usuarios.save(new Usuario("Vendedor Demo", "vendedor@demo.com", encoder.encode("vendedor123"), Role.VENDEDOR));
            }
            if (productos.count() == 0) {
                productos.save(new Producto("Laptop 14\"", new BigDecimal("2499.90"), 15));
                productos.save(new Producto("Mouse inalámbrico", new BigDecimal("39.90"), 80));
                productos.save(new Producto("Teclado mecánico", new BigDecimal("159.00"), 40));
                productos.save(new Producto("Monitor 24\"", new BigDecimal("649.00"), 25));
                productos.save(new Producto("Auriculares Bluetooth", new BigDecimal("129.50"), 50));
            }
        };
    }
}
