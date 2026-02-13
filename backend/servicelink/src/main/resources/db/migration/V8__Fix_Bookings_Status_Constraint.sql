-- ============================================================
-- V8: Fix bookings status check constraint to uppercase
-- ============================================================
-- Purpose: Align database constraint with Java enum (uppercase)
-- Issue: Java BookingStatus enum uses uppercase, DB expects lowercase
-- ============================================================

-- Drop the old constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new constraint with UPPERCASE values
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

-- Update default value to uppercase
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'PENDING';

-- If you have any existing data with lowercase status, update it
UPDATE bookings SET status = 'PENDING' WHERE status = 'pending';
UPDATE bookings SET status = 'CONFIRMED' WHERE status = 'confirmed';
UPDATE bookings SET status = 'IN_PROGRESS' WHERE status = 'in_progress';
UPDATE bookings SET status = 'COMPLETED' WHERE status = 'completed';
UPDATE bookings SET status = 'CANCELLED' WHERE status = 'cancelled';

-- ============================================================
-- Verification
-- ============================================================

DO $$
    DECLARE
        v_constraint_def TEXT;
    BEGIN
        -- Check the constraint definition
        SELECT pg_get_constraintdef(oid) INTO v_constraint_def
        FROM pg_constraint
        WHERE conname = 'bookings_status_check';

        -- Verify it contains uppercase values
        IF v_constraint_def NOT LIKE '%PENDING%' THEN
            RAISE EXCEPTION 'Status constraint verification failed. Expected uppercase values.';
        END IF;

        RAISE NOTICE 'Migration V8 completed successfully. Bookings status constraint updated to uppercase.';
    END $$;

-- ============================================================
-- Migration complete
-- ============================================================