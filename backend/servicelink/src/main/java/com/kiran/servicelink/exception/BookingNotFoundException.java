package com.kiran.servicelink.exception;

/**
 * Thrown when booking with specified ID doesn't exist
 * 
 * HTTP Status: 404 Not Found
 * 
 * Note: Could use ResourceNotFoundException instead, but this is more specific
 * Allows different handling/logging for booking-specific not-found cases
 */
public class BookingNotFoundException extends RuntimeException {

    public BookingNotFoundException(Long bookingId) {
        super(String.format("Booking not found with ID: %d", bookingId));
    }

    public BookingNotFoundException(String message) {
        super(message);
    }

    public BookingNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}