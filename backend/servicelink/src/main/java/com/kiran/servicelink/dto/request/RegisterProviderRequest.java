package com.kiran.servicelink.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RegisterProviderRequest extends RegisterRequest {

    @NotBlank(message = "Business name is required for provider registration")
    @Size(max = 255, message = "Business name must not exceed 255 characters")
    private String businessName;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @Min(value = 0, message = "Years of experience cannot be negative")
    @Max(value = 100, message = "Years of experience seems unrealistic")
    private Integer yearsOfExperience;

    private Boolean isCertified;

    private Boolean isInsured;

    @Min(value = 1, message = "Service radius must be at least 1 mile")
    @Max(value = 500, message = "Service radius cannot exceed 500 miles")
    @Builder.Default
    private Integer serviceRadiusMiles = 25;

    @Size(max = 500, message = "Profile photo URL must not exceed 500 characters")
    private String profilePhotoUrl;
}