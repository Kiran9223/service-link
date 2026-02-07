package com.kiran.servicelink.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request DTO for creating a booking
 *
 * Customer provides:
 * - Which provider's service they want
 * - Which time slot (must be available)
 * - Where the service should be performed
 * - Any special instructions
 *
 * System provides (not in request):
 * - Customer ID (from JWT token)
 * - Provider ID (from service/slot)
 * - Total price (calculated from service rate × duration)
 * - Status (starts as PENDING)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingCreateRequest {

    // ========== Service Selection ==========

    /**
     * ID of the service being booked
     * Must exist and be active
     */
    @NotNull(message = "Service ID is required")
    @Positive(message = "Service ID must be positive")
    private Long serviceId;

    /**
     * ID of the availability slot being reserved
     * Must be available (isAvailable=true, isBooked=false)
     *
     * Provider is derived from this slot
     */
    @NotNull(message = "Slot ID is required")
    @Positive(message = "Slot ID must be positive")
    private Integer slotId;

    // ========== Schedule Information ==========
    // (Derived from slot, but included for validation/convenience)

    /**
     * Date of service (must match slot date)
     * Validation: Must be future date, within slot's 10-day window
     */
    @NotNull(message = "Scheduled date is required")
    @FutureOrPresent(message = "Cannot book past dates")
    private LocalDate scheduledDate;

    /**
     * Start time of service (must match slot start time)
     */
    @NotNull(message = "Start time is required")
    private LocalTime scheduledStartTime;

    /**
     * End time of service (must match slot end time)
     */
    @NotNull(message = "End time is required")
    private LocalTime scheduledEndTime;

    // ========== Service Location ==========

    /**
     * Full street address where service will be performed
     * Example: "123 Main Street, Apt 4B"
     */
    @NotBlank(message = "Service address is required")
    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String serviceAddress;

    /**
     * City where service will be performed
     * Example: "Fullerton"
     */
    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String serviceCity;

    /**
     * State where service will be performed
     * Example: "CA" or "California"
     */
    @NotBlank(message = "State is required")
    @Size(max = 50, message = "State must not exceed 50 characters")
    private String serviceState;

    /**
     * Postal code where service will be performed
     * Example: "92831"
     */
    @NotBlank(message = "Postal code is required")
    @Size(max = 20, message = "Postal code must not exceed 20 characters")
    @Pattern(
            regexp = "^[0-9]{5}(-[0-9]{4})?$",
            message = "Invalid US postal code format (use 12345 or 12345-6789)"
    )
    private String servicePostalCode;

    // ========== Special Instructions ==========

    /**
     * Optional special instructions from customer to provider
     * Examples:
     * - "Please use side entrance"
     * - "Dog on property, please call when arriving"
     * - "Gate code is #1234"
     */
    @Size(max = 1000, message = "Special instructions must not exceed 1000 characters")
    private String specialInstructions;

    // ========== Validation Helper Methods ==========

    /**
     * Check if schedule times are valid (end > start)
     * Used by service layer for additional validation
     */
    public boolean hasValidTimeRange() {
        if (scheduledStartTime == null || scheduledEndTime == null) {
            return false;
        }
        return scheduledEndTime.isAfter(scheduledStartTime);
    }

    /**
     * Calculate duration in hours
     * Used for price calculation validation
     */
    public double getDurationHours() {
        if (scheduledStartTime == null || scheduledEndTime == null) {
            return 0.0;
        }
        long minutes = java.time.Duration.between(scheduledStartTime, scheduledEndTime).toMinutes();
        return minutes / 60.0;
    }

    /**
     * Get full service address (formatted)
     * Used for display and geocoding
     */
    public String getFullServiceAddress() {
        return String.format("%s, %s, %s %s",
                serviceAddress,
                serviceCity,
                serviceState,
                servicePostalCode
        );
    }

    /**
     * Check if date is within reasonable future range (not too far ahead)
     * Additional business validation beyond @FutureOrPresent
     */
    public boolean isWithinBookableRange() {
        if (scheduledDate == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        LocalDate maxDate = today.plusDays(10); // Matches availability slot window
        return !scheduledDate.isBefore(today) && !scheduledDate.isAfter(maxDate);
    }
}