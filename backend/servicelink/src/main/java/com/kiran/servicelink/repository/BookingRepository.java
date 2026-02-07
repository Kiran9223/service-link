package com.kiran.servicelink.repository;

import com.kiran.servicelink.entity.Booking;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.entity.User;
import com.kiran.servicelink.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    // ========== Locking Queries (Concurrency Control) ==========

    /**
     * Find booking by ID with pessimistic write lock
     * Prevents concurrent modifications during booking operations
     *
     * USE CASE: Before updating booking status, price, or schedule
     *
     * Example:
     *   Booking booking = bookingRepository.findByIdWithLock(id).orElseThrow();
     *   booking.updateStatus(CONFIRMED);
     *   // Other threads wait here until transaction commits
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdWithLock(@Param("id") Long id);

    /**
     * Find booking with all relationships loaded (avoid N+1)
     * Useful for displaying booking details
     */
    @Query("SELECT b FROM Booking b " +
            "LEFT JOIN FETCH b.customer " +
            "LEFT JOIN FETCH b.provider " +
            "LEFT JOIN FETCH b.service " +
            "LEFT JOIN FETCH b.slot " +
            "WHERE b.id = :id")
    Optional<Booking> findByIdWithRelationships(@Param("id") Long id);

    // ========== Customer Queries ==========

    /**
     * Find all bookings for a customer, ordered by scheduled date (newest first)
     * Used for: Customer dashboard "My Bookings"
     */
    List<Booking> findByCustomerOrderByScheduledDateDesc(User customer);

    /**
     * Find customer's bookings by status
     * Used for: Filter bookings by state (pending, confirmed, etc.)
     */
    List<Booking> findByCustomerAndStatusOrderByScheduledDateDesc(
            User customer,
            BookingStatus status
    );

    /**
     * Find customer's upcoming bookings (future dates only)
     */
    @Query("SELECT b FROM Booking b WHERE b.customer = :customer " +
            "AND b.scheduledDate >= :today " +
            "AND b.status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS') " +
            "ORDER BY b.scheduledDate ASC, b.scheduledStartTime ASC")
    List<Booking> findUpcomingBookingsForCustomer(
            @Param("customer") User customer,
            @Param("today") LocalDate today
    );

    /**
     * Find customer's past bookings (completed or cancelled)
     */
    @Query("SELECT b FROM Booking b WHERE b.customer = :customer " +
            "AND (b.status = 'COMPLETED' OR b.status = 'CANCELLED') " +
            "ORDER BY b.scheduledDate DESC")
    List<Booking> findPastBookingsForCustomer(@Param("customer") User customer);

    /**
     * Count pending bookings for customer
     * Used for: Badge count on dashboard
     */
    long countByCustomerAndStatus(User customer, BookingStatus status);

    // ========== Provider Queries ==========

    /**
     * Find all bookings for a provider, ordered by scheduled date
     * Used for: Provider dashboard "My Jobs"
     */
    List<Booking> findByProviderOrderByScheduledDateDesc(ServiceProvider provider);

    /**
     * Find provider's bookings by status
     * Used for: Filter jobs by state
     */
    List<Booking> findByProviderAndStatusOrderByScheduledDateDesc(
            ServiceProvider provider,
            BookingStatus status
    );

    /**
     * Find provider's pending bookings (awaiting confirmation)
     * Used for: "Action Required" section on provider dashboard
     */
    @Query("SELECT b FROM Booking b WHERE b.provider = :provider " +
            "AND b.status = 'PENDING' " +
            "ORDER BY b.requestedAt DESC")
    List<Booking> findPendingBookingsForProvider(@Param("provider") ServiceProvider provider);

    /**
     * Find provider's upcoming bookings (confirmed future jobs)
     */
    @Query("SELECT b FROM Booking b WHERE b.provider = :provider " +
            "AND b.scheduledDate >= :today " +
            "AND b.status IN ('CONFIRMED', 'IN_PROGRESS') " +
            "ORDER BY b.scheduledDate ASC, b.scheduledStartTime ASC")
    List<Booking> findUpcomingBookingsForProvider(
            @Param("provider") ServiceProvider provider,
            @Param("today") LocalDate today
    );

    /**
     * Find provider's bookings for a specific date
     * Used for: Provider's daily schedule view
     */
    @Query("SELECT b FROM Booking b WHERE b.provider = :provider " +
            "AND b.scheduledDate = :date " +
            "AND b.status NOT IN ('CANCELLED') " +
            "ORDER BY b.scheduledStartTime ASC")
    List<Booking> findProviderBookingsForDate(
            @Param("provider") ServiceProvider provider,
            @Param("date") LocalDate date
    );

    /**
     * Find provider's active booking (currently in progress)
     */
    @Query("SELECT b FROM Booking b WHERE b.provider = :provider " +
            "AND b.status = 'IN_PROGRESS' " +
            "ORDER BY b.actualStartTime DESC")
    List<Booking> findActiveBookingsForProvider(@Param("provider") ServiceProvider provider);

    /**
     * Count bookings by provider and status
     * Used for: Dashboard statistics
     */
    long countByProviderAndStatus(ServiceProvider provider, BookingStatus status);

    // ========== Status-Based Queries ==========

    /**
     * Find all bookings with specific status
     * Used for: Admin dashboard, batch operations
     */
    List<Booking> findByStatusOrderByScheduledDateDesc(BookingStatus status);

    /**
     * Find bookings in multiple statuses
     * Used for: "Active bookings" (PENDING + CONFIRMED + IN_PROGRESS)
     */
    @Query("SELECT b FROM Booking b WHERE b.status IN :statuses " +
            "ORDER BY b.scheduledDate DESC")
    List<Booking> findByStatusIn(@Param("statuses") List<BookingStatus> statuses);

    // ========== Date-Based Queries ==========

    /**
     * Find bookings for a specific date
     * Used for: Daily schedule views
     */
    List<Booking> findByScheduledDateOrderByScheduledStartTimeAsc(LocalDate date);

    /**
     * Find bookings within date range
     * Used for: Weekly/monthly reports
     */
    @Query("SELECT b FROM Booking b WHERE b.scheduledDate BETWEEN :startDate AND :endDate " +
            "ORDER BY b.scheduledDate ASC, b.scheduledStartTime ASC")
    List<Booking> findByScheduledDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Find past due bookings that should have started
     * Used for: No-show detection, automated reminders
     */
    @Query("SELECT b FROM Booking b WHERE b.status = 'CONFIRMED' " +
            "AND b.scheduledDate <= :today " +
            "AND FUNCTION('CONCAT', b.scheduledDate, ' ', b.scheduledStartTime) < :now")
    List<Booking> findPastDueBookings(
            @Param("today") LocalDate today,
            @Param("now") LocalDateTime now
    );

    // ========== Service-Based Queries ==========

    /**
     * Find bookings for a specific service
     * Used for: Service popularity analytics
     */
    @Query("SELECT b FROM Booking b WHERE b.service.id = :serviceId " +
            "ORDER BY b.scheduledDate DESC")
    List<Booking> findByServiceId(@Param("serviceId") Long serviceId);

    /**
     * Count completed bookings for a service
     * Used for: "123 bookings completed" badge
     */
    long countByServiceIdAndStatus(Long serviceId, BookingStatus status);

    // ========== Slot-Based Queries ==========

    /**
     * Find booking by slot ID
     * Used for: Check if slot is already booked
     */
    @Query("SELECT b FROM Booking b WHERE b.slot.id = :slotId")
    Optional<Booking> findBySlotId(@Param("slotId") Integer slotId);

    /**
     * Check if slot is booked (exists and not cancelled)
     */
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END " +
            "FROM Booking b WHERE b.slot.id = :slotId " +
            "AND b.status NOT IN ('CANCELLED')")
    boolean isSlotBooked(@Param("slotId") Integer slotId);

    // ========== Validation Queries ==========

    /**
     * Check if customer has overlapping booking with provider
     * Prevents double-booking same customer with same provider at same time
     */
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END " +
            "FROM Booking b WHERE b.customer = :customer " +
            "AND b.provider = :provider " +
            "AND b.scheduledDate = :date " +
            "AND b.status NOT IN ('CANCELLED', 'COMPLETED') " +
            "AND b.scheduledStartTime < :endTime " +
            "AND b.scheduledEndTime > :startTime")
    boolean hasOverlappingBooking(
            @Param("customer") User customer,
            @Param("provider") ServiceProvider provider,
            @Param("date") LocalDate date,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    // ========== Analytics Queries ==========

    /**
     * Count total bookings by provider (all time)
     */
    long countByProvider(ServiceProvider provider);

    /**
     * Count completed bookings by provider
     */
    long countByProviderAndStatus(ServiceProvider provider);

    /**
     * Get total revenue for provider (sum of completed booking prices)
     */
    @Query("SELECT COALESCE(SUM(b.totalPrice), 0) FROM Booking b " +
            "WHERE b.provider = :provider AND b.status = 'COMPLETED'")
    Double getTotalRevenueForProvider(@Param("provider") ServiceProvider provider);

    /**
     * Get average booking price for provider
     */
    @Query("SELECT AVG(b.totalPrice) FROM Booking b " +
            "WHERE b.provider = :provider AND b.status = 'COMPLETED'")
    Double getAverageBookingPriceForProvider(@Param("provider") ServiceProvider provider);

    /**
     * Find bookings created within time range
     * Used for: Signup-to-first-booking metrics
     */
    @Query("SELECT b FROM Booking b WHERE b.requestedAt BETWEEN :start AND :end " +
            "ORDER BY b.requestedAt DESC")
    List<Booking> findBookingsCreatedBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    // ========== Cleanup Queries (For Future Maintenance) ==========

    /**
     * Find stale pending bookings (pending for more than X days)
     * Used for: Automated cleanup jobs
     */
    @Query("SELECT b FROM Booking b WHERE b.status = 'PENDING' " +
            "AND b.requestedAt < :cutoffDate")
    List<Booking> findStalePendingBookings(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Delete cancelled bookings older than X days (soft delete alternative)
     */
    @Query("SELECT b FROM Booking b WHERE b.status = 'CANCELLED' " +
            "AND b.cancelledAt < :cutoffDate")
    List<Booking> findOldCancelledBookings(@Param("cutoffDate") LocalDateTime cutoffDate);
}
