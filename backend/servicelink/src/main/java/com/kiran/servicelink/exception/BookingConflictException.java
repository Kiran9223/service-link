package com.kiran.servicelink.exception;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Thrown when booking conflicts with existing booking
 * 
 * Use case: Double-booking prevention (backup to slot check)
 * 
 * HTTP Status: 409 Conflict
 * 
 * Examples:
 * - Provider has overlapping booking
 * - Customer tries to book during existing appointment
 * - Slot times conflict with another confirmed booking
 */
public class BookingConflictException extends RuntimeException {

    public BookingConflictException(String message) {
        super(message);
    }

    public BookingConflictException(
            Integer providerId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime) {
        super(String.format(
                "Provider %d already has a booking on %s from %s to %s. " +
                "Please choose a different time slot.",
                providerId,
                date,
                startTime,
                endTime
        ));
    }

    public BookingConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}