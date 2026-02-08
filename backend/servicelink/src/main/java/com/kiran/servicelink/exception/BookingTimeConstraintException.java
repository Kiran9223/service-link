package com.kiran.servicelink.exception;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Thrown when booking violates time-based business rules
 * 
 * HTTP Status: 400 Bad Request
 * 
 * Examples:
 * - Booking too far in future (>10 days)
 * - Booking in the past
 * - Duration too short (<30 min) or too long (>8 hours)
 * - End time before start time
 * - Booking outside provider's operating hours
 */
public class BookingTimeConstraintException extends RuntimeException {

    public BookingTimeConstraintException(String message) {
        super(message);
    }

    public static BookingTimeConstraintException pastDate(LocalDate date) {
        return new BookingTimeConstraintException(
                String.format("Cannot book services in the past. Date provided: %s", date)
        );
    }

    public static BookingTimeConstraintException tooFarInFuture(LocalDate date, int maxDays) {
        return new BookingTimeConstraintException(
                String.format(
                        "Cannot book more than %d days in advance. Date provided: %s",
                        maxDays,
                        date
                )
        );
    }

    public static BookingTimeConstraintException invalidTimeRange(
            LocalTime startTime,
            LocalTime endTime) {
        return new BookingTimeConstraintException(
                String.format(
                        "Invalid time range: end time (%s) must be after start time (%s)",
                        endTime,
                        startTime
                )
        );
    }

    public static BookingTimeConstraintException durationTooShort(double hours, double minHours) {
        return new BookingTimeConstraintException(
                String.format(
                        "Booking duration (%.2f hours) is too short. Minimum duration: %.2f hours",
                        hours,
                        minHours
                )
        );
    }

    public static BookingTimeConstraintException durationTooLong(double hours, double maxHours) {
        return new BookingTimeConstraintException(
                String.format(
                        "Booking duration (%.2f hours) exceeds maximum allowed duration of %.2f hours",
                        hours,
                        maxHours
                )
        );
    }

    public BookingTimeConstraintException(String message, Throwable cause) {
        super(message, cause);
    }
}