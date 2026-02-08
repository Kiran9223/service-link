package com.kiran.servicelink.exception;

/**
 * Thrown when attempting to book a slot that's already booked
 * 
 * Use case: Race condition caught after pessimistic lock
 * 
 * HTTP Status: 409 Conflict (resource state conflict)
 * 
 * Example:
 * Two users try to book same slot:
 * - User A: Gets lock, creates booking → Success
 * - User B: Gets lock, sees isBooked=true → throws SlotAlreadyBookedException
 */
public class SlotAlreadyBookedException extends RuntimeException {

    public SlotAlreadyBookedException(Integer slotId) {
        super(String.format(
                "Time slot with ID %d is already booked. Please select another time slot.",
                slotId
        ));
    }

    public SlotAlreadyBookedException(String message) {
        super(message);
    }

    public SlotAlreadyBookedException(String message, Throwable cause) {
        super(message, cause);
    }
}