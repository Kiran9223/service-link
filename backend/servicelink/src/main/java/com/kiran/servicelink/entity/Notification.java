package com.kiran.servicelink.entity;

import com.kiran.servicelink.enums.NotificationChannel;
import com.kiran.servicelink.enums.NotificationStatus;
import com.kiran.servicelink.enums.NotificationType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Notification entity - Tracks all notifications sent to users
 * 
 * Supports multiple delivery channels:
 * - EMAIL: Traditional email notifications
 * - SMS: Text message notifications
 * - IN_APP: Real-time in-app notifications via WebSocket
 * 
 * Kafka Integration:
 * - event_id: UUID from Kafka event for idempotency
 * - Prevents duplicate notifications from replayed events
 * 
 * Read Tracking:
 * - is_read: Tracks if user has viewed in-app notification
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_recipient", columnList = "recipient_user_id"),
        @Index(name = "idx_notifications_booking", columnList = "booking_id"),
        @Index(name = "idx_notifications_type", columnList = "notification_type"),
        @Index(name = "idx_notifications_status", columnList = "status"),
        @Index(name = "idx_notifications_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ========== Recipients and Context ==========

    /**
     * User who will receive this notification
     */
    @Column(name = "recipient_user_id", nullable = false)
    @NotNull(message = "Recipient user ID is required")
    private Integer recipientUserId;

    /**
     * Related booking (if applicable)
     * Nullable - not all notifications are booking-related
     */
    @Column(name = "booking_id")
    private Long bookingId;

    // ========== Notification Details ==========

    /**
     * Type of notification
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 50)
    @NotNull(message = "Notification type is required")
    private NotificationType notificationType;

    /**
     * Subject line (for email notifications)
     * Optional for SMS and in-app
     */
    @Column(name = "subject", length = 255)
    private String subject;

    /**
     * Notification message content
     */
    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    @NotNull(message = "Message is required")
    private String message;

    // ========== Delivery Configuration ==========

    /**
     * Delivery channel (EMAIL, SMS, IN_APP)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    @NotNull(message = "Channel is required")
    private NotificationChannel channel;

    /**
     * Delivery status (PENDING, SENT, DELIVERED, FAILED)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @NotNull(message = "Status is required")
    @Builder.Default
    private NotificationStatus status = NotificationStatus.PENDING;

    // ========== Kafka Integration (NEW in V10) ==========

    /**
     * Kafka event ID for idempotency
     * Prevents duplicate notifications from replayed events
     * Unique constraint in database ensures one notification per event
     */
    @Column(name = "event_id", unique = true)
    private UUID eventId;

    /**
     * Read tracking for in-app notifications
     * Only applicable when channel = IN_APP
     */
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    // ========== Delivery Tracking ==========

    /**
     * External delivery service ID (e.g., SendGrid message ID)
     * Used for tracking delivery status with external services
     */
    @Column(name = "external_id", length = 255)
    private String externalId;

    /**
     * Error message if delivery failed
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * Number of delivery retry attempts
     */
    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    // ========== Timestamps ==========

    /**
     * When notification was created
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * When notification was sent to delivery service
     */
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    /**
     * When delivery was confirmed (if applicable)
     */
    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    /**
     * When delivery failed (if applicable)
     */
    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    // ========== Relationships ==========

    /**
     * Recipient user (lazy loaded)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id", insertable = false, updatable = false)
    private User recipient;

    /**
     * Related booking (lazy loaded)
     * Nullable - not all notifications have associated bookings
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", insertable = false, updatable = false)
    private Booking booking;

    // ========== Helper Methods ==========

    /**
     * Mark notification as sent
     */
    public void markAsSent() {
        this.status = NotificationStatus.SENT;
        this.sentAt = LocalDateTime.now();
    }

    /**
     * Mark notification as delivered
     */
    public void markAsDelivered() {
        this.status = NotificationStatus.DELIVERED;
        this.deliveredAt = LocalDateTime.now();
    }

    /**
     * Mark notification as failed
     */
    public void markAsFailed(String errorMessage) {
        this.status = NotificationStatus.FAILED;
        this.failedAt = LocalDateTime.now();
        this.errorMessage = errorMessage;
    }

    /**
     * Mark notification as read (in-app only)
     */
    public void markAsRead() {
        if (this.channel == NotificationChannel.IN_APP) {
            this.isRead = true;
        }
    }

    /**
     * Check if this is an in-app notification
     */
    public boolean isInApp() {
        return this.channel == NotificationChannel.IN_APP;
    }

    /**
     * Check if notification is unread (in-app only)
     */
    public boolean isUnread() {
        return this.channel == NotificationChannel.IN_APP && !this.isRead;
    }

    /**
     * Increment retry count
     */
    public void incrementRetry() {
        this.retryCount = (this.retryCount == null ? 0 : this.retryCount) + 1;
    }
}