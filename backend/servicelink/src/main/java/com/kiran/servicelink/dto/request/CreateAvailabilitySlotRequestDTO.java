package com.kiran.servicelink.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request DTO for creating an availability slot
 * Provider ID is extracted from JWT, not from request body
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAvailabilitySlotRequestDTO {

    /**
     * Date of the availability slot
     * Must be between today and 10 days from today
     */
    @NotNull(message = "Slot date is required")
    private LocalDate slotDate;

    /**
     * Start time of the slot
     * Format: HH:mm:ss or HH:mm (e.g., "09:00" or "09:00:00")
     */
    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    /**
     * End time of the slot
     * Must be after start time
     * Format: HH:mm:ss or HH:mm (e.g., "11:00" or "11:00:00")
     */
    @NotNull(message = "End time is required")
    private LocalTime endTime;

    // Note: isAvailable defaults to true in service layer
    // Note: isBooked always starts as false
    // Note: providerId extracted from JWT token
}
