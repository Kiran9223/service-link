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
 * Payload for BOOKING_COMPLETED event
 * 
 * Published when: Provider marks service as completed
 * Triggers: 
 * - Notification to customer that service is done
 * - Notification to provider acknowledging completion
 * - Future: Trigger review request workflow
 * 
 * Contains information about:
 * - Completion details (when finished, duration)
 * - Final pricing (in case of adjustments)
 * - Service summary and notes
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingCompletedPayload {

    // ========== Booking Identification ==========
    
    /**
     * Booking ID
     */
    private Long bookingId;

    // ========== Completion Details ==========
    
    /**
     * When service was marked as completed
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime completedAt;

    /**
     * Actual start time (for duration calculation)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime actualStartTime;

    /**
     * Actual end time (same as completedAt, for clarity)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime actualEndTime;

    /**
     * Total service duration in minutes
     */
    private Integer actualDurationMinutes;

    /**
     * Originally scheduled end time (for comparison)
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledEndTime;

    /**
     * Whether service finished on time, early, or late
     * Values: "ON_TIME", "EARLY", "LATE"
     */
    private String completionStatus;

    // ========== Provider Information ==========
    
    /**
     * Provider user ID who completed the service
     */
    private Integer providerId;

    /**
     * Provider name
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

    // ========== Customer Information ==========
    
    /**
     * Customer user ID (primary recipient of notification)
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

    // ========== Pricing ==========
    
    /**
     * Final total price
     * May differ from original if scope changed
     */
    private BigDecimal totalPrice;

    /**
     * Original agreed price (for comparison)
     */
    private BigDecimal originalPrice;

    /**
     * Price adjustment amount (if any)
     * Positive = additional charge, Negative = discount
     */
    private BigDecimal priceAdjustment;

    /**
     * Reason for price adjustment
     * Example: "Additional leak repair", "Discount for inconvenience"
     */
    private String priceAdjustmentReason;

    /**
     * Currency code
     */
    @Builder.Default
    private String currency = "USD";

    // ========== Service Summary ==========
    
    /**
     * Provider's completion notes
     * Example: "Replaced main pipe and fixed two additional leaks. 
     *          Tested all connections - no issues found."
     */
    private String completionNotes;

    /**
     * Work performed summary
     */
    private String workPerformed;

    /**
     * Materials used or parts replaced
     */
    private String materialsUsed;

    /**
     * Follow-up recommendations
     * Example: "Recommend inspection again in 6 months"
     */
    private String recommendations;

    // ========== Quality Indicators ==========
    
    /**
     * Whether any issues were encountered during service
     */
    private Boolean issuesEncountered;

    /**
     * Description of issues (if any)
     */
    private String issueDescription;

    /**
     * Whether all issues were resolved
     */
    private Boolean allIssuesResolved;

    // ========== Review Request ==========
    
    /**
     * Flag to trigger review request workflow
     * Consumer can use this to schedule review request notification
     */
    @Builder.Default
    private Boolean requestReview = true;

    /**
     * Suggested delay before sending review request (in hours)
     * Example: Wait 24 hours before asking for review
     */
    @Builder.Default
    private Integer reviewRequestDelayHours = 24;
}