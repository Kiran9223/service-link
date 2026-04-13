package com.kiran.servicelink.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProviderProfileRequest {

    @Size(max = 255, message = "Business name must be at most 255 characters")
    private String businessName;

    private String description;

    @Min(value = 0, message = "Years of experience cannot be negative")
    private Integer yearsOfExperience;

    private Boolean isCertified;

    private Boolean isInsured;

    @Min(value = 1, message = "Service radius must be at least 1 mile")
    private Integer serviceRadiusMiles;
}
