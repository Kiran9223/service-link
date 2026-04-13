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
public class UserProfileResponse {

    // ── User fields ──────────────────────────────────────────────────────────
    private Integer id;
    private String name;
    private String email;
    private String phone;
    private String city;
    private String state;
    private String postalCode;
    private Role role;
    private Boolean isActive;
    private Boolean emailVerified;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastLoginAt;

    // ── Provider-only fields (null for regular users) ─────────────────────────
    private String businessName;
    private String description;
    private Integer yearsOfExperience;
    private Boolean isCertified;
    private Boolean isInsured;
    private Integer serviceRadiusMiles;
    private BigDecimal overallRating;
    private Integer totalBookingsCompleted;
}
