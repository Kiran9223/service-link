package com.kiran.servicelink.enums;

/**
 * Types of notifications in the system
 *
 * IMPORTANT: Enum names must match database CHECK constraint values (UPPERCASE)
 * JPA saves these as strings using the enum name.
 *
 * Categories:
 * - Booking lifecycle: BOOKING_CONFIRMATION, BOOKING_CREATED, BOOKING_STARTED, etc.
 * - System messages: WELCOME_EMAIL, PASSWORD_RESET
 * - User interactions: NEW_MESSAGE, REVIEW_REQUEST
 */
public enum NotificationType {

    // ========== Booking Lifecycle Notifications ==========

    /**
     * Sent when provider confirms a pending booking
     * Recipient: Customer
     */
    BOOKING_CONFIRMATION,

    /**
     * Reminder sent before scheduled booking time
     * Recipient: Both customer and provider
     */
    BOOKING_REMINDER,

    /**
     * Sent when service is marked as completed
     * Recipient: Both customer and provider
     */
    BOOKING_COMPLETION,

    /**
     * NEW (Kafka): Sent when customer creates a booking
     * Recipient: Provider
     */
    BOOKING_CREATED,

    /**
     * NEW (Kafka): Sent when provider starts service
     * Recipient: Customer
     */
    BOOKING_STARTED,

    /**
     * NEW (Kafka): Sent when booking is cancelled
     * Recipient: Both parties (except canceller)
     */
    BOOKING_CANCELLED,

    // ========== Review & Feedback ==========

    /**
     * Request for customer to review completed service
     * Recipient: Customer
     */
    REVIEW_REQUEST,

    // ========== User Communication ==========

    /**
     * New message in chat/messaging system
     * Recipient: Message recipient
     */
    NEW_MESSAGE,

    // ========== System Notifications ==========

    /**
     * Welcome email sent to new users
     * Recipient: New user
     */
    WELCOME_EMAIL,

    /**
     * Password reset link sent
     * Recipient: User requesting reset
     */
    PASSWORD_RESET,

    /**
     * Account suspended notification
     * Recipient: Suspended user
     */
    ACCOUNT_SUSPENDED;

    /**
     * Check if this notification type is related to booking lifecycle
     */
    public boolean isBookingRelated() {
        return this == BOOKING_CONFIRMATION ||
                this == BOOKING_REMINDER ||
                this == BOOKING_COMPLETION ||
                this == BOOKING_CREATED ||
                this == BOOKING_STARTED ||
                this == BOOKING_CANCELLED ||
                this == REVIEW_REQUEST;
    }

    /**
     * Check if this is a Kafka-driven event notification
     */
    public boolean isKafkaEvent() {
        return this == BOOKING_CREATED ||
                this == BOOKING_STARTED ||
                this == BOOKING_CANCELLED;
    }
}