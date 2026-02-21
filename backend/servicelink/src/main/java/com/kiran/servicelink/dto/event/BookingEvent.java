package com.kiran.servicelink.dto.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Base event envelope for all booking lifecycle events
 *
 * This envelope pattern provides:
 * - Event metadata (ID, type, version, timestamp)
 * - Aggregate identification (booking ID)
 * - Correlation tracking for distributed tracing
 * - Polymorphic payload based on event type
 *
 * All events published to Kafka follow this structure.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingEvent {

    /**
     * Unique identifier for this event (for idempotency)
     * Used by consumers to detect duplicate events
     */
    private UUID eventId;

    /**
     * Type of event (discriminator for payload)
     *
     * Valid values:
     * - BOOKING_CREATED
     * - BOOKING_CONFIRMED
     * - BOOKING_STARTED
     * - BOOKING_COMPLETED
     * - BOOKING_CANCELLED
     */
    private String eventType;

    /**
     * Schema version for this event structure
     * Enables backward compatibility as schema evolves
     */
    @Builder.Default
    private String eventVersion = "1.0";

    /**
     * When this event was created (in UTC)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime timestamp;

    /**
     * Booking ID (the aggregate this event relates to)
     */
    private Long aggregateId;

    /**
     * Aggregate type (always "BOOKING" for our use case)
     */
    @Builder.Default
    private String aggregateType = "BOOKING";

    /**
     * Correlation ID for distributed tracing
     * Links all events in the same business transaction
     */
    private UUID correlationId;

    /**
     * Event-specific payload (polymorphic based on eventType)
     *
     * This will be one of:
     * - BookingCreatedPayload
     * - BookingConfirmedPayload
     * - BookingStartedPayload
     * - BookingCompletedPayload
     * - BookingCancelledPayload
     */
    private Object payload;

    /**
     * Additional metadata about the event
     */
    private BookingEventMetadata metadata;

    // ========== Helper Methods ==========

    /**
     * Create a new event ID (UUID v4)
     */
    public static UUID generateEventId() {
        return UUID.randomUUID();
    }

    /**
     * Create a new correlation ID
     */
    public static UUID generateCorrelationId() {
        return UUID.randomUUID();
    }

    /**
     * Get current timestamp in UTC
     */
    public static LocalDateTime getCurrentTimestamp() {
        return LocalDateTime.now();
    }

    // ========== Event Type Constants ==========

    public static final String BOOKING_CREATED = "BOOKING_CREATED";
    public static final String BOOKING_CONFIRMED = "BOOKING_CONFIRMED";
    public static final String BOOKING_STARTED = "BOOKING_STARTED";
    public static final String BOOKING_COMPLETED = "BOOKING_COMPLETED";
    public static final String BOOKING_CANCELLED = "BOOKING_CANCELLED";
}