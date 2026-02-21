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
 * Payload for BOOKING_STARTED event
 * 
 * Published when: Provider marks service as started (arrives on-site)
 * Triggers: Notification to customer that service has begun
 * 
 * Contains information about:
 * - Actual start time (vs scheduled)
 * - Provider confirmation of arrival
 * - Estimated completion time
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingStartedPayload {

    // ========== Booking Identification ==========
    
    /**
     * Booking ID
     */
    private Long bookingId;

    // ========== Service Start Details ==========
    
    /**
     * Actual start time (when provider marked service as started)
     * This may differ from scheduled time
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime actualStartTime;

    /**
     * Originally scheduled start time (for comparison)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledStartTime;

    /**
     * Whether service started on time, early, or late
     * Values: "ON_TIME", "EARLY", "LATE"
     */
    private String startStatus;

    /**
     * If late, how many minutes delayed
     */
    private Integer delayMinutes;

    // ========== Provider Information ==========
    
    /**
     * Provider user ID who started the service
     */
    private Integer providerId;

    /**
     * Provider name
     */
    private String providerName;

    /**
     * Provider phone (in case customer needs to contact during service)
     */
    private String providerPhone;

    // ========== Customer Information ==========
    
    /**
     * Customer user ID (recipient of notification)
     */
    private Integer customerId;

    /**
     * Customer name
     */
    private String customerName;

    /**
     * Customer email
     */
    private String customerEmail;

    // ========== Service Information ==========
    
    /**
     * Service name
     */
    private String serviceName;

    /**
     * Service category
     */
    private String serviceCategory;

    // ========== Time Estimates ==========
    
    /**
     * Estimated completion time (calculated from actual start + duration)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime estimatedCompletionTime;

    /**
     * Estimated duration in minutes
     */
    private Integer estimatedDurationMinutes;

    // ========== Pricing ==========
    
    /**
     * Agreed price for the service
     */
    private BigDecimal totalPrice;

    /**
     * Currency code
     */
    @Builder.Default
    private String currency = "USD";

    // ========== Location ==========
    
    /**
     * Service address
     */
    private String serviceAddress;

    // ========== Provider Notes ==========
    
    /**
     * Optional notes from provider when starting
     * Example: "Starting the pipe inspection now"
     */
    private String startNotes;

    /**
     * Any issues or observations noted at start
     * Example: "Found additional leak that needs attention"
     */
    private String initialObservations;
}