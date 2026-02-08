package com.kiran.servicelink.dto.response;

import com.kiran.servicelink.enums.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Response DTO for booking data
 * 
 * Includes nested summaries for:
 * - Customer (User)
 * - Provider (ServiceProvider)
 * - Service (ServiceListing)
 * - Slot (AvailabilitySlot) - optional
 * 
 * Pattern: Avoid exposing entities directly to prevent:
 * - Circular reference issues (booking → slot → booking)
 * - Accidental password exposure
 * - Over-fetching data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponseDTO {

    // ========== Booking Identity ==========

    private Long id;
    private BookingStatus status;

    // ========== Parties Involved ==========

    private CustomerSummary customer;
    private ProviderSummary provider;
    private ServiceSummary service;
    private SlotSummary slot;  // May be null if slot deleted

    // ========== Scheduled Time ==========

    private LocalDate scheduledDate;
    private LocalTime scheduledStartTime;
    private LocalTime scheduledEndTime;
    private BigDecimal durationHours;

    // ========== Actual Time (when service performed) ==========

    private LocalDateTime actualStartTime;
    private LocalDateTime actualEndTime;
    private BigDecimal actualDurationHours;  // Calculated field

    // ========== Service Location ==========

    private String serviceAddress;
    private String serviceCity;
    private String serviceState;
    private String servicePostalCode;
    private String fullServiceAddress;  // Calculated: formatted address

    // Coordinates (if geocoded)
    private Double serviceLatitude;
    private Double serviceLongitude;

    // ========== Pricing ==========

    private BigDecimal totalPrice;

    // ========== Instructions & Notes ==========

    private String specialInstructions;

    // ========== Cancellation Info ==========

    private String cancellationReason;
    private String cancelledBy;  // "customer", "provider", "admin"

    // ========== Timestamps ==========

    private LocalDateTime requestedAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;

    // ========== Calculated/Helper Fields ==========

    /**
     * Can this booking be cancelled by the user?
     * Business rule: Only PENDING or CONFIRMED bookings can be cancelled
     */
    private Boolean canCancel;

    /**
     * Is this booking awaiting provider action?
     * (Status = PENDING)
     */
    private Boolean awaitingProviderAction;

    /**
     * Is this booking currently active?
     * (Status = CONFIRMED or IN_PROGRESS)
     */
    private Boolean isActive;

    /**
     * Is this booking in the past?
     */
    private Boolean isPast;

    /**
     * Is this booking today?
     */
    private Boolean isToday;

    /**
     * Is this booking in the future?
     */
    private Boolean isFuture;

    /**
     * Days until booking (negative if past)
     */
    private Long daysUntilBooking;

    /**
     * Has review been submitted?
     * (Check from frontend if needed, or add ratingId field)
     */
    private Boolean hasReview;

    // ========== Nested Summary DTOs ==========

    /**
     * Customer summary (minimal user info)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerSummary {
        private Integer id;
        private String name;
        private String email;
        private String phone;
        private String city;
        private String state;
    }

    /**
     * Provider summary (business info)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderSummary {
        private Integer id;
        private String businessName;
        private String ownerName;  // From user.name
        private String phone;
        private String email;
        private BigDecimal overallRating;
        private Integer totalBookingsCompleted;
        private String profilePhotoUrl;
        private Integer yearsOfExperience;
        private Boolean isCertified;
        private Boolean isInsured;
    }

    /**
     * Service summary
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceSummary {
        private Long id;
        private String serviceName;
        private String description;
        private String categoryName;
        private BigDecimal hourlyRate;
        private BigDecimal estimatedDurationHours;
    }

    /**
     * Slot summary (minimal info)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotSummary {
        private Integer id;
        private LocalDate slotDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private Boolean isAvailable;
        private Boolean isBooked;
    }

    // ========== Helper Methods for Calculated Fields ==========

    /**
     * Calculate actual duration from actual start/end times
     * Used during mapping if actualStartTime and actualEndTime exist
     */
    public static BigDecimal calculateActualDuration(
            LocalDateTime actualStart,
            LocalDateTime actualEnd) {
        if (actualStart == null || actualEnd == null) {
            return null;
        }
        long minutes = java.time.Duration.between(actualStart, actualEnd).toMinutes();
        return BigDecimal.valueOf(minutes / 60.0);
    }

    /**
     * Format full address
     */
    public static String formatFullAddress(
            String address,
            String city,
            String state,
            String postalCode) {
        return String.format("%s, %s, %s %s", address, city, state, postalCode);
    }

    /**
     * Calculate days until booking
     */
    public static long calculateDaysUntil(LocalDate scheduledDate) {
        if (scheduledDate == null) {
            return 0;
        }
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), scheduledDate);
    }
}