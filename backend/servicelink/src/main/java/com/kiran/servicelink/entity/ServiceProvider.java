package com.kiran.servicelink.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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
public class ServiceProvider {

    @Id
    @Column(name = "user_id")
    private Integer id;  // Shares PK with User

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
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
    private Boolean isCertified = false;

    @Column(name = "is_insured", nullable = false)
    private Boolean isInsured = false;

    // Service Area
    @NotNull(message = "Service radius is required")
    @Min(value = 1, message = "Service radius must be at least 1 mile")
    @Column(name = "service_radius_miles", nullable = false)
    private Integer serviceRadiusMiles = 25;

    // Performance Metrics (Denormalized)
    @DecimalMin(value = "0.0", message = "Rating cannot be negative")
    @DecimalMax(value = "5.0", message = "Rating cannot exceed 5.0")
    @Column(name = "overall_rating", precision = 3, scale = 2)
    private BigDecimal overallRating;

    @Min(value = 0)
    @Column(name = "total_bookings_completed", nullable = false)
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

    // Constructors
    public ServiceProvider() {
    }

    public ServiceProvider(User user, String businessName) {
        this.user = user;
        this.businessName = businessName;
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getYearsOfExperience() {
        return yearsOfExperience;
    }

    public void setYearsOfExperience(Integer yearsOfExperience) {
        this.yearsOfExperience = yearsOfExperience;
    }

    public Boolean getIsCertified() {
        return isCertified;
    }

    public void setIsCertified(Boolean isCertified) {
        this.isCertified = isCertified;
    }

    public Boolean getIsInsured() {
        return isInsured;
    }

    public void setIsInsured(Boolean isInsured) {
        this.isInsured = isInsured;
    }

    public Integer getServiceRadiusMiles() {
        return serviceRadiusMiles;
    }

    public void setServiceRadiusMiles(Integer serviceRadiusMiles) {
        this.serviceRadiusMiles = serviceRadiusMiles;
    }

    public BigDecimal getOverallRating() {
        return overallRating;
    }

    public void setOverallRating(BigDecimal overallRating) {
        this.overallRating = overallRating;
    }

    public Integer getTotalBookingsCompleted() {
        return totalBookingsCompleted;
    }

    public void setTotalBookingsCompleted(Integer totalBookingsCompleted) {
        this.totalBookingsCompleted = totalBookingsCompleted;
    }

    public String getProfilePhotoUrl() {
        return profilePhotoUrl;
    }

    public void setProfilePhotoUrl(String profilePhotoUrl) {
        this.profilePhotoUrl = profilePhotoUrl;
    }

    public String getBusinessPhotos() {
        return businessPhotos;
    }

    public void setBusinessPhotos(String businessPhotos) {
        this.businessPhotos = businessPhotos;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Helper method to update booking count
    public void incrementBookingCount() {
        this.totalBookingsCompleted++;
    }

    @Override
    public String toString() {
        return "ServiceProvider{" +
                "id=" + id +
                ", businessName='" + businessName + '\'' +
                ", overallRating=" + overallRating +
                ", totalBookingsCompleted=" + totalBookingsCompleted +
                '}';
    }
}
