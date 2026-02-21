-- ============================================================
-- V10: Add Kafka support & Fix notification enums to UPPERCASE
-- ============================================================
-- Purpose:
--   1. Add Kafka event tracking (event_id, is_read)
--   2. Fix all enum constraints to UPPERCASE (matching V8/V9 pattern)
-- ============================================================

-- ========== PART 1: Add Kafka Support ==========

-- Add event_id column for Kafka event idempotency
ALTER TABLE notifications
    ADD COLUMN event_id UUID;

-- Add is_read column for in-app notification read tracking
ALTER TABLE notifications
    ADD COLUMN is_read BOOLEAN DEFAULT FALSE NOT NULL;

-- Create unique index to prevent duplicate event processing
CREATE UNIQUE INDEX idx_notifications_event_id
    ON notifications(event_id)
    WHERE event_id IS NOT NULL;

-- Create composite index for efficient "unread notifications" queries
CREATE INDEX idx_notifications_user_unread
    ON notifications(recipient_user_id, is_read, created_at DESC)
    WHERE channel = 'IN_APP';

-- ========== PART 2: Fix notification_type to UPPERCASE ==========

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_notification_type_check
        CHECK (notification_type IN (
                                     'BOOKING_CONFIRMATION',
                                     'BOOKING_REMINDER',
                                     'BOOKING_COMPLETION',
                                     'REVIEW_REQUEST',
                                     'NEW_MESSAGE',
                                     'WELCOME_EMAIL',
                                     'PASSWORD_RESET',
                                     'ACCOUNT_SUSPENDED',
                                     'BOOKING_CREATED',
                                     'BOOKING_STARTED',
                                     'BOOKING_CANCELLED'
            ));

-- Update existing data to UPPERCASE
UPDATE notifications SET notification_type = UPPER(notification_type);

-- ========== PART 3: Fix channel to UPPERCASE ==========

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_channel_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_channel_check
        CHECK (channel IN ('EMAIL', 'SMS', 'IN_APP'));

-- Update existing data to UPPERCASE
UPDATE notifications SET channel = UPPER(channel);

-- ========== PART 4: Fix status to UPPERCASE ==========

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_status_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_status_check
        CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED'));

-- Update default value
ALTER TABLE notifications ALTER COLUMN status SET DEFAULT 'PENDING';

-- Update existing data to UPPERCASE
UPDATE notifications SET status = UPPER(status);

-- ========== PART 5: Add Comments ==========

COMMENT ON COLUMN notifications.event_id IS
    'Kafka event UUID for idempotency - prevents duplicate notifications from replayed events';

COMMENT ON COLUMN notifications.is_read IS
    'For in_app channel only - tracks if user has viewed the notification in UI';

-- ========== Verification ==========

DO $$
    DECLARE
        v_event_id_exists BOOLEAN;
        v_is_read_exists BOOLEAN;
        v_type_constraint TEXT;
        v_channel_constraint TEXT;
        v_status_constraint TEXT;
    BEGIN
        -- Check new columns exist
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notifications' AND column_name = 'event_id'
        ) INTO v_event_id_exists;

        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notifications' AND column_name = 'is_read'
        ) INTO v_is_read_exists;

        -- Check all constraints have UPPERCASE values
        SELECT pg_get_constraintdef(oid) INTO v_type_constraint
        FROM pg_constraint WHERE conname = 'notifications_notification_type_check';

        SELECT pg_get_constraintdef(oid) INTO v_channel_constraint
        FROM pg_constraint WHERE conname = 'notifications_channel_check';

        SELECT pg_get_constraintdef(oid) INTO v_status_constraint
        FROM pg_constraint WHERE conname = 'notifications_status_check';

        -- Verify
        IF NOT v_event_id_exists OR NOT v_is_read_exists THEN
            RAISE EXCEPTION 'Migration failed: Kafka columns not created';
        END IF;

        IF v_type_constraint NOT LIKE '%BOOKING_CREATED%' OR
           v_channel_constraint NOT LIKE '%EMAIL%' OR
           v_status_constraint NOT LIKE '%PENDING%' THEN
            RAISE EXCEPTION 'Migration failed: Constraints should have UPPERCASE values';
        END IF;

        RAISE NOTICE 'Migration V10 completed successfully. Kafka support added and all enums fixed to UPPERCASE.';
    END $$;

-- ============================================================
-- Migration complete
-- ============================================================