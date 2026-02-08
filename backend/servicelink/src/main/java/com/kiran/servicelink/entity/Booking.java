package com.kiran.servicelink.entity;

import com.kiran.servicelink.enums.BookingStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

/**
 * Booking entity - Core transaction connecting customers with providers
 *
 * Lifecycle:
 * 1. Customer creates booking (PENDING)
 * 2. Provider confirms (CONFIRMED)
 * 3. Provider starts service (IN_PROGRESS)
 * 4. Provider completes service (COMPLETED)
 *
 * Either party can cancel at any non-terminal state
 */
@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_bookings_customer", columnList = "customer_id"),
        @Index(name = "idx_bookings_provider", columnList = "provider_id"),
        @Index(name = "idx_bookings_service", columnList = "service_id"),
        @Index(name = "idx_bookings_status", columnList = "status"),
        @Index(name = "idx_bookings_date", columnList = "scheduled_date"),
        @Index(name = "idx_bookings_provider_status", columnList = "provider_id, status"),
        @Index(name = "idx_bookings_customer_status", columnList = "customer_id, status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ========== Parties Involved ==========

    /**
     * Customer who made the booking
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    @NotNull(message = "Customer is required")
    private User customer;

    /**
     * Provider fulfilling the service
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    @NotNull(message = "Provider is required")
    private ServiceProvider provider;

    /**
     * Service being booked
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    @NotNull(message = "Service is required")
    private ServiceListing service;

    /**
     * Time slot reserved for this booking
     * Nullable - slot can be deleted, booking remains
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id")
    private AvailabilitySlot slot;

    // ========== Scheduled Time ==========

    /**
     * Date of service
     */
    @Column(name = "scheduled_date", nullable = false)
    @NotNull(message = "Scheduled date is required")
    private LocalDate scheduledDate;

    /**
     * Scheduled start time
     */
    @Column(name = "scheduled_start_time", nullable = false)
    @NotNull(message = "Scheduled start time is required")
    private LocalTime scheduledStartTime;

    /**
     * Scheduled end time
     */
    @Column(name = "scheduled_end_time", nullable = false)
    @NotNull(message = "Scheduled end time is required")
    private LocalTime scheduledEndTime;

    /**
     * Duration in hours (denormalized for quick calculations)
     */
    @Column(name = "duration_hours", precision = 3, scale = 1)
    private BigDecimal durationHours;

    // ========== Actual Time (filled when service happens) ==========

    /**
     * When service actually started (provider records this)
     */
    @Column(name = "actual_start_time")
    private LocalDateTime actualStartTime;

    /**
     * When service actually ended (provider records this)
     */
    @Column(name = "actual_end_time")
    private LocalDateTime actualEndTime;

    // ========== Service Location ==========

    /**
     * Full address where service will be performed
     */
    @Column(name = "service_address", nullable = false, columnDefinition = "TEXT")
    @NotNull(message = "Service address is required")
    private String serviceAddress;

    @Column(name = "service_city", length = 100)
    private String serviceCity;

    @Column(name = "service_state", length = 50)
    private String serviceState;

    @Column(name = "service_postal_code", length = 20)
    private String servicePostalCode;

    /**
     * Geolocation for service address (for provider routing)
     */
    @Column(name = "service_latitude")
    private Double serviceLatitude;

    @Column(name = "service_longitude")
    private Double serviceLongitude;

    // ========== Pricing ==========

    /**
     * Total agreed price for this booking
     * Calculated from service rate × duration
     */
    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    @NotNull(message = "Total price is required")
    @Positive(message = "Total price must be positive")
    private BigDecimal totalPrice;

    // ========== Status and Instructions ==========

    /**
     * Current booking status
     * State transitions validated by BookingStatus enum
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @NotNull(message = "Status is required")
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    /**
     * Special instructions from customer to provider
     */
    @Column(name = "special_instructions", columnDefinition = "TEXT")
    private String specialInstructions;

    // ========== Cancellation Details ==========

    /**
     * Reason for cancellation (if cancelled)
     */
    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    /**
     * Who cancelled the booking
     */
    @Column(name = "cancelled_by", length = 20)
    private String cancelledBy; // "customer", "provider", "admin"

    // ========== Lifecycle Timestamps ==========

    /**
     * When booking was created (customer submitted request)
     */
    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    /**
     * When provider confirmed the booking
     */
    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    /**
     * When service was marked as completed
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * When booking was cancelled
     */
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    // ========== Helper Methods ==========

    /**
     * Check if this booking can be cancelled
     */
    public boolean isCancellable() {
        return status.isCancellable();
    }

    /**
     * Check if provider can confirm/decline this booking
     */
    public boolean isAwaitingProviderAction() {
        return status.isAwaitingProviderAction();
    }

    /**
     * Check if service is currently active
     */
    public boolean isActive() {
        return status.isActive();
    }

    /**
     * Check if booking is finalized (completed or cancelled)
     */
    public boolean isFinalized() {
        return status.isFinalized();
    }

    /**
     * Calculate actual duration in hours (if service completed)
     */
    public BigDecimal getActualDurationHours() {
        if (actualStartTime != null && actualEndTime != null) {
            long minutes = java.time.Duration.between(actualStartTime, actualEndTime).toMinutes();
            return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 1, java.math.RoundingMode.HALF_UP);
        }
        return null;
    }

    /**
     * Check if booking is in the past
     */
    public boolean isPast() {
        return scheduledDate.isBefore(LocalDate.now());
    }

    /**
     * Check if booking is today
     */
    public boolean isToday() {
        return scheduledDate.equals(LocalDate.now());
    }

    /**
     * Check if booking is in the future
     */
    public boolean isFuture() {
        return scheduledDate.isAfter(LocalDate.now());
    }

    /**
     * Update status and set appropriate timestamp
     */
    public void updateStatus(BookingStatus newStatus) {
        // Validate transition
        if (!this.status.canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                    String.format("Cannot transition from %s to %s", this.status, newStatus)
            );
        }

        this.status = newStatus;

        // Set appropriate timestamp
        switch (newStatus) {
            case CONFIRMED -> this.confirmedAt = LocalDateTime.now();
            case COMPLETED -> this.completedAt = LocalDateTime.now();
            case CANCELLED -> this.cancelledAt = LocalDateTime.now();
            case IN_PROGRESS -> this.actualStartTime = LocalDateTime.now();
        }
    }

    /**
     * Mark booking as cancelled
     */
    public void cancel(String cancelledBy, String reason) {
        if (!isCancellable()) {
            throw new IllegalStateException("Cannot cancel booking in " + status + " status");
        }

        this.status = BookingStatus.CANCELLED;
        this.cancelledBy = cancelledBy;
        this.cancellationReason = reason;
        this.cancelledAt = LocalDateTime.now();
    }
}