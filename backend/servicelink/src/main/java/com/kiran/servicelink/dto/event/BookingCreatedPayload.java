package com.kiran.servicelink.dto.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Payload for BOOKING_CREATED event
 * 
 * Published when: Customer creates a new booking
 * Triggers: Notification to provider about pending booking request
 * 
 * Contains all information needed for notification:
 * - Who: Customer and provider details
 * - What: Service being booked
 * - When: Scheduled time
 * - How much: Price
 * - Special notes: Any instructions from customer
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingCreatedPayload {

    // ========== Booking Identification ==========
    
    /**
     * Booking ID (same as aggregateId in envelope)
     * Included in payload for convenience
     */
    private Long bookingId;

    // ========== Customer Information ==========
    
    /**
     * Customer user ID
     */
    private Integer customerId;

    /**
     * Customer full name (for notification message)
     */
    private String customerName;

    /**
     * Customer email (for future email notifications)
     */
    private String customerEmail;

    /**
     * Customer phone (for future SMS notifications)
     */
    private String customerPhone;

    // ========== Provider Information ==========
    
    /**
     * Provider user ID
     */
    private Integer providerId;

    /**
     * Provider business name
     */
    private String providerName;

    /**
     * Provider email
     */
    private String providerEmail;

    /**
     * Provider phone
     */
    private String providerPhone;

    // ========== Service Information ==========
    
    /**
     * Service listing ID
     */
    private Long serviceListingId;

    /**
     * Service name (e.g., "Emergency Plumbing Repair")
     */
    private String serviceName;

    /**
     * Service category (e.g., "Plumbing")
     */
    private String serviceCategory;

    // ========== Booking Schedule ==========
    
    /**
     * When service is scheduled to start
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledStartTime;

    /**
     * When service is scheduled to end
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledEndTime;

    /**
     * Duration in minutes (calculated field)
     */
    private Integer durationMinutes;

    // ========== Pricing ==========
    
    /**
     * Total price for the booking
     */
    private BigDecimal totalPrice;

    /**
     * Currency code (default: USD)
     */
    @Builder.Default
    private String currency = "USD";

    // ========== Booking Details ==========
    
    /**
     * Special instructions from customer to provider
     * Example: "Please bring extra parts", "Call when arriving"
     */
    private String specialInstructions;

    /**
     * Service location address (formatted string)
     */
    private String serviceAddress;

    /**
     * Service location latitude
     */
    private Double serviceLatitude;

    /**
     * Service location longitude
     */
    private Double serviceLongitude;

    // ========== Timestamps ==========
    
    /**
     * When this booking was created (requested)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime requestedAt;
}