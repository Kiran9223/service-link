package com.kiran.servicelink.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

/**
 * Represents a provider's availability slot
 * Implements 10-day rolling window - slots can only be created for next 10 days
 *
 * UPDATED: Added bidirectional relationship with Booking
 */
@Entity
@Table(name = "availability_slots", indexes = {
        @Index(name = "idx_availability_provider", columnList = "provider_id"),
        @Index(name = "idx_availability_date", columnList = "slot_date"),
        @Index(name = "idx_availability_provider_date", columnList = "provider_id, slot_date"),
        @Index(name = "idx_availability_status", columnList = "is_available, is_booked")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class AvailabilitySlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Provider who owns this availability slot
     * References ServiceProvider.userId (Integer)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private ServiceProvider provider;

    /**
     * Date of the availability slot
     * Must be between today and 10 days from today
     */
    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;

    /**
     * Start time of the slot (time only, date is in slot_date)
     */
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    /**
     * End time of the slot (time only, date is in slot_date)
     * Must be after start_time
     */
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    /**
     * Whether the slot is available for booking
     * false = Provider blocked this time (not available)
     * true = Provider is available (but may be booked)
     */
    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private Boolean isAvailable = true;

    /**
     * Whether the slot has been booked by a customer
     * false = Available for booking
     * true = Already booked
     */
    @Column(name = "is_booked", nullable = false)
    @Builder.Default
    private Boolean isBooked = false;

    /**
     * Bidirectional relationship to booking
     * This allows us to navigate from slot → booking easily
     *
     * mappedBy: Booking entity owns the relationship (has the FK)
     * cascade: When slot deleted, booking should NOT be deleted (handled by ON DELETE SET NULL in DB)
     * orphanRemoval: false - booking can exist without slot reference
     */
    @OneToOne(mappedBy = "slot", fetch = FetchType.LAZY)
    private Booking booking;

    /**
     * Denormalized booking ID for quick access without loading relationship
     * This column is managed by the database FK constraint, not JPA
     * insertable/updatable = false because Booking side manages this
     */
    @Column(name = "booking_id", insertable = false, updatable = false)
    private Integer bookingId;

    /**
     * When this slot was created
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ========== Helper Methods ==========

    /**
     * Check if this slot can be booked
     * Available for booking if: available AND not yet booked
     */
    public boolean isBookable() {
        return isAvailable && !isBooked;
    }

    /**
     * Check if this slot overlaps with another time range
     * Used for validation to prevent overlapping slots
     */
    public boolean overlapsWithTimeRange(LocalTime otherStart, LocalTime otherEnd) {
        // Two time ranges overlap if:
        // (start1 < end2) AND (end1 > start2)
        return startTime.isBefore(otherEnd) && endTime.isAfter(otherStart);
    }

    /**
     * Get duration of this slot in minutes
     */
    public long getDurationMinutes() {
        return java.time.Duration.between(startTime, endTime).toMinutes();
    }

    /**
     * Check if this slot is in the past
     */
    public boolean isPast() {
        LocalDate today = LocalDate.now();
        return slotDate.isBefore(today);
    }

    /**
     * Check if this slot is within the 10-day window
     */
    public boolean isWithinTenDayWindow() {
        LocalDate today = LocalDate.now();
        LocalDate tenDaysFromNow = today.plusDays(10);
        return !slotDate.isBefore(today) && !slotDate.isAfter(tenDaysFromNow);
    }

    // ========== Booking Management Methods ==========

    /**
     * Mark this slot as booked
     * Called when booking is confirmed
     *
     * @param booking The booking that reserves this slot
     */
    public void markAsBooked(Booking booking) {
        if (!isBookable()) {
            throw new IllegalStateException(
                    "Cannot book slot: " +
                            (isBooked ? "already booked" : "not available")
            );
        }
        this.isBooked = true;
        this.booking = booking;
        // bookingId is managed by database FK, will be set automatically
    }

    /**
     * Release this slot (make available again)
     * Called when booking is cancelled
     */
    public void release() {
        this.isBooked = false;
        this.booking = null;
        // bookingId will be set to NULL by database CASCADE
    }

    /**
     * Get the booking that owns this slot
     * Returns null if not booked
     */
    public Booking getOwningBooking() {
        return booking;
    }

    /**
     * Check if this slot has an associated booking
     */
    public boolean hasBooking() {
        return booking != null || bookingId != null;
    }
}