package com.kiran.servicelink.exception;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Thrown when slot exists but is not available for booking
 * 
 * HTTP Status: 409 Conflict
 * 
 * Reasons slot might be unavailable:
 * - isAvailable = false (provider blocked it)
 * - isBooked = true (already booked)
 * - Slot is in the past
 * - Slot is outside 10-day window
 */
public class SlotNotAvailableException extends RuntimeException {

    public SlotNotAvailableException(Integer slotId) {
        super(String.format(
                "Time slot with ID %d is not available for booking. " +
                "It may be blocked by the provider or already booked by another customer.",
                slotId
        ));
    }

    public SlotNotAvailableException(
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            String reason) {
        super(String.format(
                "Time slot on %s from %s to %s is not available. Reason: %s",
                date,
                startTime,
                endTime,
                reason
        ));
    }

    public SlotNotAvailableException(String message) {
        super(message);
    }

    public SlotNotAvailableException(String message, Throwable cause) {
        super(message, cause);
    }
}