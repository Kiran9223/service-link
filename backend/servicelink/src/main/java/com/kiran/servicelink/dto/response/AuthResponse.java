package com.kiran.servicelink.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)  // Don't include null fields in JSON
public class AuthResponse {

    // JWT token
    private String accessToken;

    // Token type (always "Bearer" for JWT)
    @Builder.Default
    private String tokenType = "Bearer";

    // User information
    private UserDTO user;

    // Provider information (only if user is a provider)
    private ServiceProviderDTO provider;

    // Token expiration in seconds (e.g., 3600 for 1 hour)
    private Long expiresIn;

    // Success message (optional)
    private String message;

    // Convenience constructors for different scenarios

    // For regular user registration/login
    public AuthResponse(String accessToken, UserDTO user, Long expiresIn) {
        this.accessToken = accessToken;
        this.tokenType = "Bearer";
        this.user = user;
        this.expiresIn = expiresIn;
    }

    // For provider registration/login
    public AuthResponse(String accessToken, UserDTO user, ServiceProviderDTO provider, Long expiresIn) {
        this.accessToken = accessToken;
        this.tokenType = "Bearer";
        this.user = user;
        this.provider = provider;
        this.expiresIn = expiresIn;
    }
}