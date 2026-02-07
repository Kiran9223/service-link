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
    private Integer id;  // Changed from Long to Integer

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
     * Reference to the booking that occupies this slot
     * NULL if not booked
     * Set when booking is created (Day 5-6 feature)
     */
    @Column(name = "booking_id")
    private Integer bookingId;  // Changed from Long to Integer

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
}
