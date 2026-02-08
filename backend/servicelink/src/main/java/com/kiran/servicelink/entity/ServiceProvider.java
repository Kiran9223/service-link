package com.kiran.servicelink.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_providers", indexes = {
        @Index(name = "idx_providers_rating", columnList = "overall_rating"),
        @Index(name = "idx_providers_created", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@EqualsAndHashCode(of = "id")
public class ServiceProvider {

    @Id
    @Column(name = "user_id")
    private Integer id;  // Shares PK with User

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    @ToString.Exclude  // Avoid circular reference in toString
    private User user;

    // Business Information
    @NotBlank(message = "Business name is required")
    @Size(max = 255)
    @Column(name = "business_name", nullable = false, length = 255)
    private String businessName;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Qualifications
    @Min(value = 0, message = "Years of experience cannot be negative")
    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(name = "is_certified", nullable = false)
    @Builder.Default
    private Boolean isCertified = false;

    @Column(name = "is_insured", nullable = false)
    @Builder.Default
    private Boolean isInsured = false;

    // Service Area
    @NotNull(message = "Service radius is required")
    @Min(value = 1, message = "Service radius must be at least 1 mile")
    @Column(name = "service_radius_miles", nullable = false)
    @Builder.Default
    private Integer serviceRadiusMiles = 25;

    // Performance Metrics (Denormalized)
    @DecimalMin(value = "0.0", message = "Rating cannot be negative")
    @DecimalMax(value = "5.0", message = "Rating cannot exceed 5.0")
    @Column(name = "overall_rating", precision = 3, scale = 2)
    private BigDecimal overallRating;

    @Min(value = 0)
    @Column(name = "total_bookings_completed", nullable = false)
    @Builder.Default
    private Integer totalBookingsCompleted = 0;

    // Photos
    @Size(max = 500)
    @Column(name = "profile_photo_url", length = 500)
    private String profilePhotoUrl;

    @Column(name = "business_photos", columnDefinition = "TEXT")
    private String businessPhotos;  // JSON array of URLs or comma-separated

    // Timestamps
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Custom methods
    public void incrementBookingCount() {
        this.totalBookingsCompleted++;
    }

    public Double getLatitude() {
        return user != null ? user.getLatitude() : null;
    }

    public Double getLongitude() {
        return user != null ? user.getLongitude() : null;
    }
}
