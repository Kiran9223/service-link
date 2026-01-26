package com.kiran.servicelink.controller;

import com.kiran.servicelink.dto.request.LoginRequest;
import com.kiran.servicelink.dto.request.RegisterProviderRequest;
import com.kiran.servicelink.dto.request.RegisterRequest;
import com.kiran.servicelink.dto.response.AuthResponse;
import com.kiran.servicelink.dto.response.UserDTO;
import com.kiran.servicelink.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Register a new regular user
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterRequest request) {
        logger.info("User registration request received for email: {}", request.getEmail());
        AuthResponse response = authService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Register a new service provider
     * POST /api/auth/register/provider
     */
    @PostMapping("/register/provider")
    public ResponseEntity<AuthResponse> registerProvider(
            @Valid @RequestBody RegisterProviderRequest request) {
        logger.info("Provider registration request received for email: {}", request.getEmail());
        AuthResponse response = authService.registerProvider(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Login
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        logger.info("Login request received for email: {}", request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get current user information (requires authentication)
     * GET /api/auth/me
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDTO> getCurrentUser() {
        logger.info("Get current user request received");
        UserDTO user = authService.getCurrentUser();
        return ResponseEntity.ok(user);
    }

    /**
     * Get current user with provider info (if applicable)
     * GET /api/auth/me/full
     */
    @GetMapping("/me/full")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> getCurrentUserFull() {
        logger.info("Get current user full info request received");
        AuthResponse response = authService.getCurrentUserWithProvider();
        return ResponseEntity.ok(response);
    }

    /**
     * Health check endpoint (public)
     * GET /api/auth/health
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Auth service is running");
    }
}