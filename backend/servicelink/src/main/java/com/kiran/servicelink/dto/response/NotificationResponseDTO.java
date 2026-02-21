package com.kiran.servicelink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for notification data
 * 
 * Sent to:
 * - REST API clients (GET /api/notifications)
 * - WebSocket subscribers (/user/queue/notifications)
 * 
 * Contains minimal information needed for UI display
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponseDTO {

    /**
     * Notification ID
     */
    private Long id;

    /**
     * Related booking ID (if applicable)
     * Null for non-booking notifications
     */
    private Long bookingId;

    /**
     * Type of notification as string
     * Example: "BOOKING_CREATED", "BOOKING_CONFIRMED"
     */
    private String notificationType;

    /**
     * Notification subject/title
     * Example: "New Booking Request", "Booking Confirmed! ✅"
     */
    private String subject;

    /**
     * Full notification message
     * Example: "John Doe requested Emergency Plumbing Repair..."
     */
    private String message;

    /**
     * Whether user has read this notification
     * Only relevant for in-app notifications
     */
    private Boolean isRead;

    /**
     * When notification was created
     */
    private LocalDateTime createdAt;

    // ========== Optional: Can add these for richer UI ==========

    /**
     * Service name (if booking-related)
     * Extracted from message, not stored separately
     */
    private String serviceName;

    /**
     * Provider name (if booking-related)
     * Extracted from message, not stored separately
     */
    private String providerName;

    /**
     * Customer name (if provider is viewing)
     * Extracted from message, not stored separately
     */
    private String customerName;
}