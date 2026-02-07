package com.kiran.servicelink.repository;

import com.kiran.servicelink.entity.AvailabilitySlot;
import com.kiran.servicelink.entity.ServiceProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, Integer> {

    // ========== Provider Operations ==========

    /**
     * Find all slots for a provider, ordered by date and start time
     * Used for: Provider dashboard "My Availability"
     */
    List<AvailabilitySlot> findByProviderOrderBySlotDateAscStartTimeAsc(ServiceProvider provider);

    /**
     * Find provider's slots for a specific date
     * Used for: Provider viewing their schedule for one day
     */
    List<AvailabilitySlot> findByProviderAndSlotDateOrderByStartTimeAsc(
            ServiceProvider provider,
            LocalDate slotDate
    );

    /**
     * Find provider's slots within a date range
     * Used for: Provider viewing their schedule for a week
     */
    List<AvailabilitySlot> findByProviderAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(
            ServiceProvider provider,
            LocalDate startDate,
            LocalDate endDate
    );

    // ========== Public Queries (For Booking) ==========

    /**
     * Find all bookable slots for a provider
     * Bookable = isAvailable=true AND isBooked=false
     * Only future dates
     */
    @Query("SELECT s FROM AvailabilitySlot s " +
            "WHERE s.provider = :provider " +
            "AND s.isAvailable = true " +
            "AND s.isBooked = false " +
            "AND s.slotDate >= :today " +
            "ORDER BY s.slotDate ASC, s.startTime ASC")
    List<AvailabilitySlot> findBookableSlotsForProvider(
            @Param("provider") ServiceProvider provider,
            @Param("today") LocalDate today
    );

    /**
     * Find bookable slots for a provider on a specific date
     * Used for: Customer picking a time slot on chosen date
     */
    @Query("SELECT s FROM AvailabilitySlot s " +
            "WHERE s.provider = :provider " +
            "AND s.slotDate = :date " +
            "AND s.isAvailable = true " +
            "AND s.isBooked = false " +
            "ORDER BY s.startTime ASC")
    List<AvailabilitySlot> findBookableSlotsForProviderOnDate(
            @Param("provider") ServiceProvider provider,
            @Param("date") LocalDate date
    );

    /**
     * Find bookable slots for a provider within date range
     * Used for: Customer browsing availability for next few days
     */
    @Query("SELECT s FROM AvailabilitySlot s " +
            "WHERE s.provider = :provider " +
            "AND s.slotDate BETWEEN :startDate AND :endDate " +
            "AND s.isAvailable = true " +
            "AND s.isBooked = false " +
            "ORDER BY s.slotDate ASC, s.startTime ASC")
    List<AvailabilitySlot> findBookableSlotsForProviderInDateRange(
            @Param("provider") ServiceProvider provider,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // ========== Validation Queries ==========

    /**
     * Find overlapping slots for validation
     * Used to prevent creating overlapping slots for same provider
     *
     * A slot overlaps if:
     * - Same provider
     * - Same date
     * - Time ranges overlap: (start1 < end2) AND (end1 > start2)
     */
    @Query("SELECT s FROM AvailabilitySlot s " +
            "WHERE s.provider = :provider " +
            "AND s.slotDate = :date " +
            "AND s.startTime < :endTime " +
            "AND s.endTime > :startTime")
    List<AvailabilitySlot> findOverlappingSlots(
            @Param("provider") ServiceProvider provider,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    /**
     * Find overlapping slots excluding a specific slot ID
     * Used for: Update validation (don't count the slot being updated)
     */
    @Query("SELECT s FROM AvailabilitySlot s " +
            "WHERE s.provider = :provider " +
            "AND s.slotDate = :date " +
            "AND s.id != :excludeSlotId " +
            "AND s.startTime < :endTime " +
            "AND s.endTime > :startTime")
    List<AvailabilitySlot> findOverlappingSlotsExcluding(
            @Param("provider") ServiceProvider provider,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeSlotId") Integer excludeSlotId
    );

    /**
     * Count bookable slots for a provider
     * Used for: Provider stats
     */
    @Query("SELECT COUNT(s) FROM AvailabilitySlot s " +
            "WHERE s.provider = :provider " +
            "AND s.isAvailable = true " +
            "AND s.isBooked = false " +
            "AND s.slotDate >= :today")
    long countBookableSlotsForProvider(
            @Param("provider") ServiceProvider provider,
            @Param("today") LocalDate today
    );

    // ========== Cleanup Queries (For Future Maintenance) ==========

    /**
     * Find all past slots
     * Used for: Cleanup job to delete old slots
     */
    List<AvailabilitySlot> findBySlotDateBefore(LocalDate date);

    /**
     * Delete past slots
     * Used for: Automated cleanup
     */
    void deleteBySlotDateBefore(LocalDate date);
}