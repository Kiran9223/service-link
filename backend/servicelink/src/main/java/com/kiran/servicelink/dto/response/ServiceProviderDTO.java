package com.kiran.servicelink.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
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
public class ServiceProviderDTO {

    private Integer id;

    // Embedded user information
    private UserDTO user;

    // Business information
    private String businessName;
    private String description;

    // Qualifications
    private Integer yearsOfExperience;
    private Boolean isCertified;
    private Boolean isInsured;

    // Service area
    private Integer serviceRadiusMiles;

    // Performance metrics
    private BigDecimal overallRating;
    private Integer totalBookingsCompleted;

    // Photos
    private String profilePhotoUrl;
    private String businessPhotos;

    // Timestamps
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    // Computed fields (not from database)
    private Boolean isNewProvider;  // Joined within 30 days
    private Boolean isEligibleForBoost;  // Eligible for fairness boost

    // Helper method to set computed fields
    public void computeDerivedFields() {
        // Provider is "new" if joined within last 30 days
        if (createdAt != null) {
            this.isNewProvider = createdAt.isAfter(LocalDateTime.now().minusDays(30));
        }

        // Eligible for boost if new OR has fewer than 20 bookings
        this.isEligibleForBoost = (isNewProvider != null && isNewProvider) ||
                (totalBookingsCompleted != null && totalBookingsCompleted < 20);
    }
}