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
 * Payload for BOOKING_CANCELLED event
 * 
 * Published when: Customer or provider cancels a booking
 * Triggers: Notification to the other party about cancellation
 * 
 * Contains information about:
 * - Who cancelled and why
 * - When it was cancelled
 * - Refund details (if applicable)
 * - Original booking details for reference
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingCancelledPayload {

    // ========== Booking Identification ==========
    
    /**
     * Booking ID
     */
    private Long bookingId;

    // ========== Cancellation Details ==========
    
    /**
     * When booking was cancelled
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime cancelledAt;

    /**
     * Who cancelled the booking
     * Values: "CUSTOMER", "PROVIDER", "ADMIN", "SYSTEM"
     */
    private String cancelledBy;

    /**
     * User ID of person who cancelled
     */
    private Integer cancelledByUserId;

    /**
     * Name of person who cancelled
     */
    private String cancelledByName;

    /**
     * Reason for cancellation
     * Example: "Schedule conflict", "Found another provider", "Customer not available"
     */
    private String cancellationReason;

    /**
     * Detailed cancellation notes (optional)
     */
    private String cancellationNotes;

    // ========== Original Booking Status ==========
    
    /**
     * What status was booking in before cancellation
     * Values: "PENDING", "CONFIRMED", "IN_PROGRESS"
     */
    private String previousStatus;

    /**
     * How much notice was given (in hours)
     * Useful for cancellation policy enforcement
     */
    private Integer hoursNoticeGiven;

    // ========== Customer Information ==========
    
    /**
     * Customer user ID
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
     * Service name that was cancelled
     */
    private String serviceName;

    /**
     * Service category
     */
    private String serviceCategory;

    // ========== Original Schedule ==========
    
    /**
     * When service was scheduled to start
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledStartTime;

    /**
     * When service was scheduled to end
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledEndTime;

    // ========== Financial Details ==========
    
    /**
     * Original booking price
     */
    private BigDecimal originalPrice;

    /**
     * Refund amount (if applicable)
     * May be full, partial, or zero based on cancellation policy
     */
    private BigDecimal refundAmount;

    /**
     * Refund status
     * Values: "FULL_REFUND", "PARTIAL_REFUND", "NO_REFUND", "PENDING"
     */
    private String refundStatus;

    /**
     * Cancellation fee charged (if any)
     */
    private BigDecimal cancellationFee;

    /**
     * Reason for refund amount
     * Example: "Full refund - cancelled >24 hours in advance"
     *          "50% refund - cancelled <24 hours notice"
     *          "No refund - service already started"
     */
    private String refundReason;

    /**
     * Currency code
     */
    @Builder.Default
    private String currency = "USD";

    // ========== Timing Analysis ==========
    
    /**
     * How much time until scheduled start (at time of cancellation)
     * Useful for analytics and policy enforcement
     */
    private Long hoursUntilScheduledStart;

    /**
     * Whether cancellation violated cancellation policy
     */
    private Boolean policyViolation;

    /**
     * Policy violation details
     */
    private String policyViolationDetails;

    // ========== Rebooking Information ==========
    
    /**
     * Whether customer can rebook with same provider
     */
    @Builder.Default
    private Boolean canRebook = true;

    /**
     * Suggested alternative action for customer
     * Example: "Search for another provider", "Reschedule for later date"
     */
    private String suggestedAction;

    // ========== Impact Tracking ==========
    
    /**
     * Whether this was a repeat cancellation from same customer
     */
    private Boolean repeatCancellation;

    /**
     * Number of previous cancellations by this customer (with any provider)
     */
    private Integer customerCancellationCount;

    /**
     * Number of previous cancellations by this provider
     */
    private Integer providerCancellationCount;
}