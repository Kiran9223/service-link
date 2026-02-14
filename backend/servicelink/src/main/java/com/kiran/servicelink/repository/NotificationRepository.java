package com.kiran.servicelink.repository;

import com.kiran.servicelink.entity.Notification;
import com.kiran.servicelink.enums.NotificationChannel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Notification entity
 * 
 * Provides methods for:
 * - Retrieving user notifications (paginated)
 * - Counting unread notifications
 * - Finding by event ID (Kafka idempotency)
 * - Filtering by channel and read status
 * - Booking-specific notifications
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // ========== User Notifications Queries ==========

    /**
     * Get all notifications for a user (paginated)
     * Ordered by newest first
     * 
     * @param userId User ID
     * @param channel Notification channel (EMAIL, SMS, IN_APP)
     * @param pageable Pagination parameters
     * @return Page of notifications
     */
    Page<Notification> findByRecipientUserIdAndChannelOrderByCreatedAtDesc(
            Integer userId,
            NotificationChannel channel,
            Pageable pageable
    );

    /**
     * Get all notifications for a user across all channels (paginated)
     * Ordered by newest first
     * 
     * @param userId User ID
     * @param pageable Pagination parameters
     * @return Page of notifications
     */
    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(
            Integer userId,
            Pageable pageable
    );

    /**
     * Get unread in-app notifications for a user
     * Ordered by newest first
     * 
     * @param userId User ID
     * @param channel Notification channel (should be IN_APP)
     * @return List of unread notifications
     */
    List<Notification> findByRecipientUserIdAndChannelAndIsReadFalseOrderByCreatedAtDesc(
            Integer userId,
            NotificationChannel channel
    );

    /**
     * Get unread in-app notifications for a user (paginated)
     * 
     * @param userId User ID
     * @param channel Notification channel (should be IN_APP)
     * @param pageable Pagination parameters
     * @return Page of unread notifications
     */
    Page<Notification> findByRecipientUserIdAndChannelAndIsReadFalseOrderByCreatedAtDesc(
            Integer userId,
            NotificationChannel channel,
            Pageable pageable
    );

    // ========== Count Queries ==========

    /**
     * Count unread in-app notifications for a user
     * Used for badge count in UI
     * 
     * @param userId User ID
     * @param channel Notification channel (should be IN_APP)
     * @return Count of unread notifications
     */
    Long countByRecipientUserIdAndChannelAndIsReadFalse(
            Integer userId,
            NotificationChannel channel
    );

    /**
     * Count total notifications for a user
     * 
     * @param userId User ID
     * @return Total notification count
     */
    Long countByRecipientUserId(Integer userId);

    // ========== Kafka Idempotency ==========

    /**
     * Find notification by Kafka event ID
     * Used to prevent duplicate notifications from replayed events
     * 
     * @param eventId Kafka event UUID
     * @return Optional notification
     */
    Optional<Notification> findByEventId(UUID eventId);

    /**
     * Check if notification already exists for this event
     * More efficient than findByEventId when you only need existence check
     * 
     * @param eventId Kafka event UUID
     * @return true if notification exists for this event
     */
    boolean existsByEventId(UUID eventId);

    // ========== Booking-Specific Queries ==========

    /**
     * Get all notifications for a specific booking
     * Ordered by newest first
     * 
     * @param bookingId Booking ID
     * @return List of notifications
     */
    List<Notification> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    /**
     * Get notifications for a booking filtered by user
     * Useful for showing user only their notifications for a booking
     * 
     * @param bookingId Booking ID
     * @param userId User ID
     * @return List of notifications
     */
    List<Notification> findByBookingIdAndRecipientUserIdOrderByCreatedAtDesc(
            Long bookingId,
            Integer userId
    );

    // ========== Bulk Update Operations ==========

    /**
     * Mark all unread in-app notifications as read for a user
     * 
     * @param userId User ID
     * @param channel Notification channel (should be IN_APP)
     * @return Number of notifications updated
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true " +
           "WHERE n.recipientUserId = :userId " +
           "AND n.channel = :channel " +
           "AND n.isRead = false")
    int markAllAsRead(
            @Param("userId") Integer userId,
            @Param("channel") NotificationChannel channel
    );

    /**
     * Delete old notifications for a user
     * Useful for cleanup jobs
     * 
     * @param userId User ID
     * @param daysAgo Only delete notifications older than this many days
     * @return Number of notifications deleted
     */
    @Modifying
    @Query("DELETE FROM Notification n " +
           "WHERE n.recipientUserId = :userId " +
           "AND n.createdAt < CURRENT_TIMESTAMP - :daysAgo DAY")
    int deleteOldNotifications(
            @Param("userId") Integer userId,
            @Param("daysAgo") int daysAgo
    );

    // ========== Statistics Queries ==========

    /**
     * Count notifications by type for a user
     * Useful for analytics
     * 
     * @param userId User ID
     * @return List of [NotificationType, Count] tuples
     */
    @Query("SELECT n.notificationType, COUNT(n) " +
           "FROM Notification n " +
           "WHERE n.recipientUserId = :userId " +
           "GROUP BY n.notificationType")
    List<Object[]> countByTypeForUser(@Param("userId") Integer userId);

    /**
     * Get recent notifications for a user (last N)
     * 
     * @param userId User ID
     * @return List of recent notifications
     */
    @Query("SELECT n FROM Notification n " +
           "WHERE n.recipientUserId = :userId " +
           "ORDER BY n.createdAt DESC")
    List<Notification> findRecentNotifications(
            @Param("userId") Integer userId,
            Pageable pageable
    );
}