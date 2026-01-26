package com.kiran.servicelink.dto.response;

import com.kiran.servicelink.enums.PricingType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for service listings
 * Includes denormalized provider and category data for convenience
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceListingResponseDTO {

    private Long id;

    // Provider summary (denormalized)
    private ProviderSummary provider;

    // Category summary (denormalized)
    private CategorySummary category;

    // Service details
    private String serviceName;
    private String description;

    // Pricing
    private PricingType pricingType;
    private BigDecimal hourlyRate;
    private BigDecimal fixedPrice;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;

    // Duration
    private BigDecimal estimatedDurationHours;

    // Status
    private Boolean isActive;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Nested DTOs for related entities

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderSummary {
        private Long id;
        private String businessName;
        private BigDecimal overallRating;
        private Integer totalBookingsCompleted;
        private Integer yearsOfExperience;
        private String profilePhotoUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySummary {
        private Long id;
        private String name;
    }
}