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
 * Payload for BOOKING_CONFIRMED event
 * 
 * Published when: Provider confirms/accepts a pending booking
 * Triggers: Notification to customer that their booking is confirmed
 * 
 * Contains information about:
 * - Confirmation details (who confirmed, when)
 * - Finalized schedule
 * - Provider information for customer reference
 * - Any additional instructions from provider
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingConfirmedPayload {

    // ========== Booking Identification ==========
    
    /**
     * Booking ID
     */
    private Long bookingId;

    // ========== Confirmation Details ==========
    
    /**
     * When the booking was confirmed
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime confirmedAt;

    /**
     * Who confirmed (provider user ID)
     */
    private Integer confirmedBy;

    /**
     * Provider's name who confirmed
     */
    private String confirmedByName;

    // ========== Customer Information (for notification) ==========
    
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

    /**
     * Customer phone
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
     * Provider phone (for customer to contact)
     */
    private String providerPhone;

    // ========== Service Information ==========
    
    /**
     * Service name
     */
    private String serviceName;

    /**
     * Service category
     */
    private String serviceCategory;

    // ========== Finalized Schedule ==========
    
    /**
     * Confirmed start time
     * (May differ from originally requested time if provider adjusted)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledStartTime;

    /**
     * Confirmed end time
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledEndTime;

    /**
     * Estimated duration in minutes
     */
    private Integer estimatedDuration;

    // ========== Pricing ==========
    
    /**
     * Final confirmed price
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

    /**
     * Service location latitude
     */
    private Double serviceLatitude;

    /**
     * Service location longitude
     */
    private Double serviceLongitude;

    // ========== Additional Instructions ==========
    
    /**
     * Original customer instructions
     */
    private String customerInstructions;

    /**
     * Provider's additional instructions or notes
     * Example: "I'll call 30 minutes before arrival"
     */
    private String providerNotes;

    /**
     * Any special requirements provider wants customer to know
     */
    private String specialRequirements;
}