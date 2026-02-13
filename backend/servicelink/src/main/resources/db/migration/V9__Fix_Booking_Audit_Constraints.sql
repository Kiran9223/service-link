-- ============================================================
-- FIX 2: booking_audit.action constraint
-- ============================================================

-- Drop the old constraint
ALTER TABLE booking_audit DROP CONSTRAINT IF EXISTS booking_audit_action_check;

-- Add new constraint with UPPERCASE values
ALTER TABLE booking_audit ADD CONSTRAINT booking_audit_action_check
    CHECK (action IN (
                      'BOOKING_CREATED',
                      'BOOKING_CONFIRMED',
                      'BOOKING_STARTED',
                      'BOOKING_COMPLETED',
                      'BOOKING_CANCELLED',
                      'STATUS_CHANGED',
                      'PRICE_CHANGED',
                      'SCHEDULE_CHANGED',
                      'INSTRUCTIONS_UPDATED',
                      'NO_SHOW_RECORDED'
        ));

-- Update existing data (if any)
UPDATE booking_audit SET action = 'BOOKING_CREATED' WHERE action = 'booking_created';
UPDATE booking_audit SET action = 'BOOKING_CONFIRMED' WHERE action = 'booking_confirmed';
UPDATE booking_audit SET action = 'BOOKING_STARTED' WHERE action = 'booking_started';
UPDATE booking_audit SET action = 'BOOKING_COMPLETED' WHERE action = 'booking_completed';
UPDATE booking_audit SET action = 'BOOKING_CANCELLED' WHERE action = 'booking_cancelled';
UPDATE booking_audit SET action = 'STATUS_CHANGED' WHERE action = 'status_changed';
UPDATE booking_audit SET action = 'PRICE_CHANGED' WHERE action = 'price_changed';
UPDATE booking_audit SET action = 'SCHEDULE_CHANGED' WHERE action = 'schedule_changed';
UPDATE booking_audit SET action = 'INSTRUCTIONS_UPDATED' WHERE action = 'instructions_updated';
UPDATE booking_audit SET action = 'NO_SHOW_RECORDED' WHERE action = 'no_show_recorded';

-- ============================================================
-- FIX 3: booking_audit.performed_by_role constraint
-- ============================================================

-- Drop the old constraint
ALTER TABLE booking_audit DROP CONSTRAINT IF EXISTS booking_audit_performed_by_role_check;

-- Add new constraint with UPPERCASE values
ALTER TABLE booking_audit ADD CONSTRAINT booking_audit_performed_by_role_check
    CHECK (performed_by_role IN ('CUSTOMER', 'PROVIDER', 'ADMIN', 'SYSTEM'));

-- Update existing data (if any)
UPDATE booking_audit SET performed_by_role = 'CUSTOMER' WHERE performed_by_role = 'customer';
UPDATE booking_audit SET performed_by_role = 'PROVIDER' WHERE performed_by_role = 'provider';
UPDATE booking_audit SET performed_by_role = 'ADMIN' WHERE performed_by_role = 'admin';
UPDATE booking_audit SET performed_by_role = 'SYSTEM' WHERE performed_by_role = 'system';

-- ============================================================
-- Verification
-- ============================================================

DO $$
    DECLARE
        v_bookings_status TEXT;
        v_audit_action TEXT;
        v_audit_role TEXT;
    BEGIN
        -- Check bookings status constraint
        SELECT pg_get_constraintdef(oid) INTO v_bookings_status
        FROM pg_constraint
        WHERE conname = 'bookings_status_check';

        -- Check audit action constraint
        SELECT pg_get_constraintdef(oid) INTO v_audit_action
        FROM pg_constraint
        WHERE conname = 'booking_audit_action_check';

        -- Check audit role constraint
        SELECT pg_get_constraintdef(oid) INTO v_audit_role
        FROM pg_constraint
        WHERE conname = 'booking_audit_performed_by_role_check';

        -- Verify all contain uppercase values
        IF v_bookings_status NOT LIKE '%PENDING%' OR
           v_audit_action NOT LIKE '%BOOKING_CREATED%' OR
           v_audit_role NOT LIKE '%CUSTOMER%' THEN
            RAISE EXCEPTION 'Constraint verification failed. Expected uppercase values.';
        END IF;

        RAISE NOTICE 'Migration V8 completed successfully. All booking constraints updated to uppercase.';
    END $$;

-- ============================================================
-- Migration complete
-- ============================================================
