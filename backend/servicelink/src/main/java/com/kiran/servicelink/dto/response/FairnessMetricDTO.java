package com.kiran.servicelink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FairnessMetricDTO {

    private Long providerId;
    private String providerName;
    private Double overallRating;
    private Integer totalBookingsCompleted;
    private Long reviewCount;

    // Score breakdown
    private Double ratingScore;        // (rating/5.0) * 0.4
    private Double popularityScore;    // (min(bookings,20)/20.0) * 0.2
    private Double availabilityScore;  // constant 0.2
    private Double proximityScore;     // constant 0.2
    private Double baseScore;          // sum of above four
    private Double fairnessBoost;      // +0.15 if bookings < 20, else 0.0
    private Double finalScore;         // baseScore + fairnessBoost

    private Boolean isNewProvider;     // totalBookingsCompleted < 20
}
