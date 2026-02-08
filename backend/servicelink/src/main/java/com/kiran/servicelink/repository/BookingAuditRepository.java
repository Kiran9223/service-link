package com.kiran.servicelink.repository;

import com.kiran.servicelink.entity.Booking;
import com.kiran.servicelink.entity.BookingAudit;
import com.kiran.servicelink.entity.BookingAudit.AuditAction;
import com.kiran.servicelink.entity.BookingAudit.AuditRole;
import com.kiran.servicelink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for booking audit trail
 *
 * CRITICAL: This is append-only data
 * - Never UPDATE audit records
 * - Never DELETE audit records (except cascade when booking deleted)
 * - Only INSERT new records via save()
 */
@Repository
public interface BookingAuditRepository extends JpaRepository<BookingAudit, Long> {

    // ========== Booking History Queries ==========

    /**
     * Get complete audit trail for a booking (newest first)
     * Used for: Booking detail page "History" section
     *
     * Returns all changes made to this booking in reverse chronological order
     */
    List<BookingAudit> findByBookingOrderByPerformedAtDesc(Booking booking);

    /**
     * Get complete audit trail for a booking (oldest first)
     * Used for: Timeline view showing progression
     */
    List<BookingAudit> findByBookingOrderByPerformedAtAsc(Booking booking);

    /**
     * Get audit trail for booking by ID
     * Convenient when you only have booking ID, not entity
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.booking.id = :bookingId " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> findByBookingIdOrderByPerformedAtDesc(@Param("bookingId") Long bookingId);

    /**
     * Count audit entries for a booking
     * Used for: "123 changes" badge
     */
    long countByBooking(Booking booking);

    // ========== Action-Based Queries ==========

    /**
     * Find specific action in booking history
     * Used for: "Who confirmed this booking?" "When was it cancelled?"
     *
     * Returns the FIRST occurrence of this action (oldest)
     */
    Optional<BookingAudit> findFirstByBookingAndActionOrderByPerformedAtAsc(
            Booking booking,
            AuditAction action
    );

    /**
     * Find all occurrences of an action for a booking
     * Used for: Track repeated actions (e.g., multiple schedule changes)
     */
    List<BookingAudit> findByBookingAndActionOrderByPerformedAtDesc(
            Booking booking,
            AuditAction action
    );

    /**
     * Find all audit entries with specific action (across all bookings)
     * Used for: Analytics - "How many bookings were cancelled today?"
     */
    List<BookingAudit> findByActionOrderByPerformedAtDesc(AuditAction action);

    /**
     * Count occurrences of an action
     * Used for: Dashboard metrics
     */
    long countByAction(AuditAction action);

    // ========== User Activity Queries ==========

    /**
     * Get all actions performed by a user (newest first)
     * Used for: User activity log, admin monitoring
     */
    List<BookingAudit> findByPerformedByUserOrderByPerformedAtDesc(User user);

    /**
     * Get recent actions by a user (limit results)
     * Used for: "Recent activity" widget
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.performedByUser = :user " +
            "ORDER BY a.performedAt DESC LIMIT :limit")
    List<BookingAudit> findRecentActionsByUser(
            @Param("user") User user,
            @Param("limit") int limit
    );

    /**
     * Get actions performed by a user on a specific booking
     * Used for: "What did this user do to this booking?"
     */
    List<BookingAudit> findByBookingAndPerformedByUserOrderByPerformedAtDesc(
            Booking booking,
            User user
    );

    /**
     * Count actions by user
     * Used for: User engagement metrics
     */
    long countByPerformedByUser(User user);

    // ========== Role-Based Queries ==========

    /**
     * Find actions performed by specific role
     * Used for: "Show me all customer cancellations" or "Show system actions"
     */
    List<BookingAudit> findByPerformedByRoleOrderByPerformedAtDesc(AuditRole role);

    /**
     * Find actions by role for a specific booking
     * Used for: Filter booking history by who made changes
     */
    List<BookingAudit> findByBookingAndPerformedByRoleOrderByPerformedAtDesc(
            Booking booking,
            AuditRole role
    );

    /**
     * Count actions by role
     * Used for: Analytics - "Customer vs Provider initiated changes"
     */
    long countByPerformedByRole(AuditRole role);

    /**
     * Find system-initiated actions (automated)
     * Used for: Monitor automated processes
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.performedByRole = 'SYSTEM' " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> findSystemActions();

    // ========== Time-Based Queries ==========

    /**
     * Find audit entries within date range
     * Used for: Compliance reports, "Show changes in January 2025"
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.performedAt BETWEEN :start AND :end " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> findByPerformedAtBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    /**
     * Find audit entries after a specific date
     * Used for: "Show changes since last review"
     */
    List<BookingAudit> findByPerformedAtAfterOrderByPerformedAtDesc(LocalDateTime after);

    /**
     * Find recent audit entries (last N hours)
     * Used for: Real-time monitoring dashboard
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.performedAt >= :cutoff " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> findRecentAudits(@Param("cutoff") LocalDateTime cutoff);

    // ========== Combined Filters ==========

    /**
     * Find actions by booking and action type within date range
     * Used for: "Show all cancellations for this booking in March"
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.booking = :booking " +
            "AND a.action = :action " +
            "AND a.performedAt BETWEEN :start AND :end " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> findByBookingAndActionAndDateRange(
            @Param("booking") Booking booking,
            @Param("action") AuditAction action,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    /**
     * Find actions by user and action type
     * Used for: "Show all bookings confirmed by this provider"
     */
    List<BookingAudit> findByPerformedByUserAndActionOrderByPerformedAtDesc(
            User user,
            AuditAction action
    );

    // ========== Analytics Queries ==========

    /**
     * Count actions by booking (for activity heatmap)
     */
    @Query("SELECT a.booking.id, COUNT(a) FROM BookingAudit a " +
            "WHERE a.booking.id IN :bookingIds " +
            "GROUP BY a.booking.id")
    List<Object[]> countActionsByBookings(@Param("bookingIds") List<Long> bookingIds);

    /**
     * Get action type distribution
     * Used for: "What actions are most common?"
     */
    @Query("SELECT a.action, COUNT(a) FROM BookingAudit a " +
            "GROUP BY a.action " +
            "ORDER BY COUNT(a) DESC")
    List<Object[]> getActionDistribution();

    /**
     * Get role distribution for actions
     * Used for: "Who makes changes most often?"
     */
    @Query("SELECT a.performedByRole, COUNT(a) FROM BookingAudit a " +
            "GROUP BY a.performedByRole " +
            "ORDER BY COUNT(a) DESC")
    List<Object[]> getRoleDistribution();

    /**
     * Find bookings with most changes (high-maintenance bookings)
     * Used for: Identify problematic bookings
     */
    @Query("SELECT a.booking, COUNT(a) as changeCount FROM BookingAudit a " +
            "GROUP BY a.booking " +
            "HAVING COUNT(a) > :threshold " +
            "ORDER BY changeCount DESC")
    List<Object[]> findHighActivityBookings(@Param("threshold") long threshold);

    /**
     * Get average time between booking creation and confirmation
     * Used for: Provider response time metrics
     */
    @Query("SELECT AVG(TIMESTAMPDIFF(MINUTE, created.performedAt, confirmed.performedAt)) " +
            "FROM BookingAudit created " +
            "JOIN BookingAudit confirmed ON created.booking = confirmed.booking " +
            "WHERE created.action = 'BOOKING_CREATED' " +
            "AND confirmed.action = 'BOOKING_CONFIRMED' " +
            "AND created.performedAt < confirmed.performedAt")
    Double getAverageConfirmationTimeMinutes();

    // ========== Dispute Resolution Queries ==========

    /**
     * Find all changes to booking price
     * Used for: Billing disputes
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.booking = :booking " +
            "AND a.action = 'PRICE_CHANGED' " +
            "ORDER BY a.performedAt ASC")
    List<BookingAudit> findPriceChangesForBooking(@Param("booking") Booking booking);

    /**
     * Find all schedule changes for a booking
     * Used for: Dispute resolution "Who kept changing the time?"
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.booking = :booking " +
            "AND a.action = 'SCHEDULE_CHANGED' " +
            "ORDER BY a.performedAt ASC")
    List<BookingAudit> findScheduleChangesForBooking(@Param("booking") Booking booking);

    /**
     * Find who cancelled and why
     * Used for: Cancellation analysis
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.booking = :booking " +
            "AND a.action = 'BOOKING_CANCELLED' " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> findCancellationRecord(@Param("booking") Booking booking);

    // ========== Compliance Queries ==========

    /**
     * Export audit trail for compliance (all fields)
     * Used for: Legal discovery, compliance audits
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.performedAt BETWEEN :start AND :end " +
            "ORDER BY a.performedAt ASC")
    List<BookingAudit> exportAuditTrailForDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    /**
     * Find audit entries with comments (important notes)
     * Used for: Review flagged entries
     */
    @Query("SELECT a FROM BookingAudit a WHERE a.comments IS NOT NULL " +
            "AND a.comments != '' " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> findEntriesWithComments();

    // ========== Search Queries ==========

    /**
     * Search audit trail by comment content
     * Used for: Find specific incidents "no-show", "late", etc.
     */
    @Query("SELECT a FROM BookingAudit a WHERE LOWER(a.comments) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> searchByComments(@Param("searchTerm") String searchTerm);

    /**
     * Search audit trail by old or new value
     * Used for: "Find when status was changed from PENDING"
     */
    @Query("SELECT a FROM BookingAudit a WHERE " +
            "LOWER(a.oldValue) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(a.newValue) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "ORDER BY a.performedAt DESC")
    List<BookingAudit> searchByValue(@Param("searchTerm") String searchTerm);
}