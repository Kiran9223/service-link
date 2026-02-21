package com.kiran.servicelink.dto.event;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Metadata wrapper for booking events
 * 
 * Contains contextual information about the event:
 * - Who triggered it (userId)
 * - Which provider is involved (providerId)
 * - Where it originated (source service)
 * 
 * This metadata helps consumers:
 * - Route notifications to correct users
 * - Filter events by provider
 * - Debug event flow across services
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingEventMetadata {

    /**
     * User ID who triggered this event
     * 
     * Examples:
     * - BOOKING_CREATED: Customer ID
     * - BOOKING_CONFIRMED: Provider ID
     * - BOOKING_CANCELLED: ID of person who cancelled
     */
    private Integer userId;

    /**
     * Service provider ID associated with this booking
     * 
     * Used for:
     * - Partitioning Kafka messages (ensures ordering per provider)
     * - Filtering events in consumer
     * - Notification routing
     */
    private Integer providerId;

    /**
     * Customer ID for this booking
     * 
     * Useful for notification routing and analytics
     */
    private Integer customerId;

    /**
     * Source service that published this event
     * 
     * For debugging and distributed tracing
     * Example: "booking-service"
     */
    @Builder.Default
    private String source = "booking-service";

    /**
     * Optional: IP address of request that triggered event
     * (For security audit trail)
     */
    private String ipAddress;

    /**
     * Optional: User agent string
     * (For debugging mobile vs web vs API access)
     */
    private String userAgent;
}