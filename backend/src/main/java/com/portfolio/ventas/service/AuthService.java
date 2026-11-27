package com.portfolio.ventas.service;

import com.portfolio.ventas.dto.Dtos.AuthResponse;
import com.portfolio.ventas.dto.Dtos.LoginRequest;
import com.portfolio.ventas.dto.Dtos.RegisterRequest;
import com.portfolio.ventas.model.Role;
import com.portfolio.ventas.model.Usuario;
import com.portfolio.ventas.repository.UsuarioRepository;
import com.portfolio.ventas.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authManager;
    private final JwtService jwt;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder,
                       AuthenticationManager authManager, JwtService jwt) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.authManager = authManager;
        this.jwt = jwt;
    }

    /** El registro publico siempre crea usuarios con rol VENDEDOR. */
    public AuthResponse registrar(RegisterRequest req) {
        if (usuarios.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya está registrado");
        }
        Usuario u = usuarios.save(new Usuario(
                req.nombre(), req.email(), encoder.encode(req.password()), Role.VENDEDOR));
        return respuesta(u);
    }

    public AuthResponse login(LoginRequest req) {
        // Lanza BadCredentialsException si el email o la contraseña no coinciden
        authManager.authenticate(new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        Usuario u = usuarios.findByEmail(req.email()).orElseThrow();
        return respuesta(u);
    }

    private AuthResponse respuesta(Usuario u) {
        return new AuthResponse(jwt.generarToken(u.getEmail(), u.getRole().name()),
                u.getNombre(), u.getEmail(), u.getRole().name());
    }
}
