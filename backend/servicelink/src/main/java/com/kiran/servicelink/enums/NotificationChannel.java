package com.kiran.servicelink.enums;

/**
 * Channels through which notifications can be delivered
 * 
 * IMPORTANT: Enum names must match database CHECK constraint values (UPPERCASE)
 */
public enum NotificationChannel {
    
    /**
     * Email notification
     * Delivered via SMTP to user's email address
     */
    EMAIL,
    
    /**
     * SMS notification
     * Delivered via SMS gateway to user's phone number
     */
    SMS,
    
    /**
     * In-app notification
     * Displayed in application UI, supports real-time via WebSocket
     */
    IN_APP;
    
    /**
     * Check if this channel supports real-time delivery
     */
    public boolean isRealTime() {
        return this == IN_APP;
    }
    
    /**
     * Check if this channel requires external service
     */
    public boolean requiresExternalService() {
        return this == EMAIL || this == SMS;
    }
}