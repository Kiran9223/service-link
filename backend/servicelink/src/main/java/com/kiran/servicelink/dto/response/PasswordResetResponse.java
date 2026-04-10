package com.kiran.servicelink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PasswordResetResponse {
    private String resetToken;
    private long expiresIn;   // seconds
    private String message;
}
