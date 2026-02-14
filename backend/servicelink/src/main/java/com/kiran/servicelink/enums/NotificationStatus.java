package com.kiran.servicelink.enums;

/**
 * Delivery status of a notification
 * 
 * IMPORTANT: Enum names must match database CHECK constraint values (UPPERCASE)
 * 
 * Status flow:
 * PENDING → SENT → DELIVERED
 *        ↘ FAILED
 */
public enum NotificationStatus {
    
    /**
     * Notification created but not yet sent
     * Waiting for delivery processing
     */
    PENDING,
    
    /**
     * Notification sent to delivery service
     * - Email: Sent to SMTP server
     * - SMS: Sent to SMS gateway
     * - In-app: Stored in database and broadcasted via WebSocket
     */
    SENT,
    
    /**
     * Notification confirmed delivered
     * - Email: Delivery receipt received
     * - SMS: Delivery confirmation from gateway
     * - In-app: User acknowledged (optional)
     */
    DELIVERED,
    
    /**
     * Notification delivery failed
     * - Email: Bounce or SMTP error
     * - SMS: Invalid number or gateway error
     * - In-app: WebSocket connection failed (but still in DB)
     */
    FAILED;
    
    /**
     * Check if this status indicates successful delivery
     */
    public boolean isSuccessful() {
        return this == SENT || this == DELIVERED;
    }
    
    /**
     * Check if this status is terminal (no further state changes)
     */
    public boolean isTerminal() {
        return this == DELIVERED || this == FAILED;
    }
    
    /**
     * Check if retry is possible
     */
    public boolean canRetry() {
        return this == PENDING || this == FAILED;
    }
}