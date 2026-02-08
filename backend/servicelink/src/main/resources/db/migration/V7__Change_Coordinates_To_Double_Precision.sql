-- ============================================================
-- V7: Change coordinate columns from DECIMAL to DOUBLE PRECISION
-- ============================================================
-- Purpose: Align database types with Java Double type
-- Reason: Hibernate maps Double to DOUBLE PRECISION, not NUMERIC
-- ============================================================

-- DECIMAL(10,8) in database → NUMERIC in SQL
-- Double in Java → DOUBLE PRECISION in SQL
-- These don't match, causing schema validation error

-- ============================================================
-- Change users table coordinates
-- ============================================================

ALTER TABLE users
    ALTER COLUMN latitude TYPE DOUBLE PRECISION,
    ALTER COLUMN longitude TYPE DOUBLE PRECISION;

-- ============================================================
-- Change bookings table coordinates
-- ============================================================

ALTER TABLE bookings
    ALTER COLUMN service_latitude TYPE DOUBLE PRECISION,
    ALTER COLUMN service_longitude TYPE DOUBLE PRECISION;

-- ============================================================
-- Verification
-- ============================================================

DO $$
    DECLARE
        v_users_lat_type TEXT;
        v_bookings_lat_type TEXT;
    BEGIN
        -- Check users.latitude type
        SELECT data_type INTO v_users_lat_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'latitude';

        -- Check bookings.service_latitude type
        SELECT data_type INTO v_bookings_lat_type
        FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'service_latitude';

        -- Verify both are double precision
        IF v_users_lat_type != 'double precision' OR v_bookings_lat_type != 'double precision' THEN
            RAISE EXCEPTION 'Migration verification failed. Expected double precision but got: users.latitude=%, bookings.service_latitude=%',
                v_users_lat_type, v_bookings_lat_type;
        END IF;

        RAISE NOTICE 'Migration V7 completed successfully. All coordinate columns converted to DOUBLE PRECISION.';
    END $$;

-- ============================================================
-- Migration complete
-- ============================================================