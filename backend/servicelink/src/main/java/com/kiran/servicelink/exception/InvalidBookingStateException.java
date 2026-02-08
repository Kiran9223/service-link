package com.kiran.servicelink.exception;

import com.kiran.servicelink.enums.BookingStatus;

/**
 * Thrown when attempting invalid state transition
 * 
 * Use case: State machine violation
 * 
 * HTTP Status: 400 Bad Request (client error)
 * 
 * Examples:
 * - Try to confirm COMPLETED booking
 * - Try to start CANCELLED booking
 * - Try to cancel COMPLETED booking
 */
public class InvalidBookingStateException extends RuntimeException {

    public InvalidBookingStateException(Long bookingId, BookingStatus currentStatus, BookingStatus attemptedStatus) {
        super(String.format(
                "Cannot transition booking %d from %s to %s. This state transition is not allowed.",
                bookingId,
                currentStatus,
                attemptedStatus
        ));
    }

    public InvalidBookingStateException(Long bookingId, BookingStatus currentStatus, String action) {
        super(String.format(
                "Cannot perform '%s' on booking %d with status %s. Current status does not allow this action.",
                action,
                bookingId,
                currentStatus
        ));
    }

    public InvalidBookingStateException(String message) {
        super(message);
    }

    public InvalidBookingStateException(String message, Throwable cause) {
        super(message, cause);
    }
}