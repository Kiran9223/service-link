package com.kiran.servicelink.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.kiran.servicelink.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {

    private Integer id;
    private String name;
    private String email;
    private String phone;

    // Location
    private String city;
    private String state;
    private String country;
    private String postalCode;
    private Double latitude;
    private Double longitude;

    // Account info
    private Role role;
    private Boolean isActive;
    private Boolean emailVerified;

    // Timestamps
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastLoginAt;

    // Helper methods
    public boolean isProvider() {
        return role == Role.SERVICE_PROVIDER;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
