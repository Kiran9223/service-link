package com.kiran.servicelink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

/**
 * Response DTO for availability slots
 * Includes provider summary for convenience
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySlotResponseDTO {

    private Integer id;

    /**
     * Provider summary (denormalized for convenience)
     */
    private ProviderSummary provider;

    /**
     * Date of the availability slot
     */
    private LocalDate slotDate;

    /**
     * Start time of the slot
     */
    private LocalTime startTime;

    /**
     * End time of the slot
     */
    private LocalTime endTime;

    /**
     * Duration in minutes (calculated)
     */
    private Long durationMinutes;

    /**
     * Whether the slot is available (not blocked by provider)
     */
    private Boolean isAvailable;

    /**
     * Whether the slot has been booked
     */
    private Boolean isBooked;

    /**
     * Whether this slot can be booked (available AND not booked)
     */
    private Boolean isBookable;

    /**
     * Reference to booking (if booked)
     * Null if not booked
     */
    private Integer bookingId;

    /**
     * When this slot was created
     */
    private LocalDateTime createdAt;

    // ========== Nested DTO ==========

    /**
     * Provider summary information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderSummary {
        private Integer id;
        private String businessName;
        private BigDecimal overallRating;
        private Integer totalBookingsCompleted;
    }
}
