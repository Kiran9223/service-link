package com.kiran.servicelink.dto.request;

import com.kiran.servicelink.enums.PricingType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO for creating/updating service listings
 * Provider ID is extracted from JWT token, not from request body
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceListingRequestDTO {

    @NotNull(message = "Category ID is required")
    @Positive(message = "Category ID must be positive")
    private Long categoryId;

    @NotBlank(message = "Service name is required")
    @Size(max = 255, message = "Service name must not exceed 255 characters")
    private String serviceName;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @NotNull(message = "Pricing type is required")
    private PricingType pricingType;

    // Pricing fields - validation is conditional based on pricingType
    // Validated in service layer, not here
    @DecimalMin(value = "0.01", message = "Hourly rate must be positive")
    private BigDecimal hourlyRate;

    @DecimalMin(value = "0.01", message = "Fixed price must be positive")
    private BigDecimal fixedPrice;

    @DecimalMin(value = "0.01", message = "Minimum price must be positive")
    private BigDecimal minPrice;

    @DecimalMin(value = "0.01", message = "Maximum price must be positive")
    private BigDecimal maxPrice;

    @DecimalMin(value = "0.1", message = "Duration must be at least 0.1 hours")
    @DecimalMax(value = "99.9", message = "Duration must not exceed 99.9 hours")
    private BigDecimal estimatedDurationHours;

    // Note: isActive is not in request DTO
    // New services are active by default
    // Deactivation happens through separate endpoint: DELETE /api/services/{id}
}