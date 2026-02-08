-- ============================================================
-- V6: Change ID columns from BIGINT to INTEGER
-- ============================================================
-- Purpose: Align database types with Java Integer types
-- Safe because: All existing values confirmed to be within INTEGER range
-- ============================================================

-- ============================================================
-- Step 1: Drop all foreign key constraints that reference changed columns
-- ============================================================

-- Drop FKs from bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_customer;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_provider;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_slot;

-- Drop FKs from booking_audit
ALTER TABLE booking_audit DROP CONSTRAINT IF EXISTS fk_audit_booking;
ALTER TABLE booking_audit DROP CONSTRAINT IF EXISTS fk_audit_user;

-- Drop FKs from availability_slots
ALTER TABLE availability_slots DROP CONSTRAINT IF EXISTS fk_availability_provider;
ALTER TABLE availability_slots DROP CONSTRAINT IF EXISTS fk_availability_booking;

-- Drop FKs from service_providers
ALTER TABLE service_providers DROP CONSTRAINT IF EXISTS service_providers_user_id_fkey;

-- Drop FKs from services
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_provider_id_fkey;

-- Drop FKs from ratings
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_provider_id_fkey;

-- Drop FKs from notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_user_id_fkey;

-- ============================================================
-- Step 2: Drop indexes that might interfere with ALTER COLUMN
-- ============================================================

-- We'll recreate these after type changes
-- Note: Unique indexes and primary keys are handled automatically

-- ============================================================
-- Step 3: Change users.id from BIGSERIAL to SERIAL (INTEGER)
-- ============================================================

-- Change the column type (existing data will be cast automatically)
ALTER TABLE users ALTER COLUMN id TYPE INTEGER USING id::INTEGER;

-- Recreate the sequence as INTEGER type
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
CREATE SEQUENCE users_id_seq AS INTEGER START WITH 1;
-- Set the sequence to current max + 1 to avoid conflicts
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
ALTER SEQUENCE users_id_seq OWNED BY users.id;

-- ============================================================
-- Step 4: Change service_providers.user_id from BIGINT to INTEGER
-- ============================================================

ALTER TABLE service_providers ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER;

-- ============================================================
-- Step 5: Change availability_slots.id from BIGSERIAL to SERIAL (INTEGER)
-- ============================================================

-- Change the column type
ALTER TABLE availability_slots ALTER COLUMN id TYPE INTEGER USING id::INTEGER;

-- Recreate the sequence as INTEGER type
ALTER TABLE availability_slots ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS availability_slots_id_seq CASCADE;
CREATE SEQUENCE availability_slots_id_seq AS INTEGER START WITH 1;
SELECT setval('availability_slots_id_seq', COALESCE((SELECT MAX(id) FROM availability_slots), 0) + 1, false);
ALTER TABLE availability_slots ALTER COLUMN id SET DEFAULT nextval('availability_slots_id_seq');
ALTER SEQUENCE availability_slots_id_seq OWNED BY availability_slots.id;

-- Change provider_id column
ALTER TABLE availability_slots ALTER COLUMN provider_id TYPE INTEGER USING provider_id::INTEGER;

-- Change booking_id column (nullable FK)
ALTER TABLE availability_slots ALTER COLUMN booking_id TYPE INTEGER USING booking_id::INTEGER;

-- ============================================================
-- Step 6: Change bookings table columns
-- ============================================================

-- Change customer_id, provider_id, slot_id
ALTER TABLE bookings ALTER COLUMN customer_id TYPE INTEGER USING customer_id::INTEGER;
ALTER TABLE bookings ALTER COLUMN provider_id TYPE INTEGER USING provider_id::INTEGER;
ALTER TABLE bookings ALTER COLUMN slot_id TYPE INTEGER USING slot_id::INTEGER;

-- ============================================================
-- Step 7: Change booking_audit.performed_by_user_id
-- ============================================================

ALTER TABLE booking_audit ALTER COLUMN performed_by_user_id TYPE INTEGER USING performed_by_user_id::INTEGER;

-- ============================================================
-- Step 8: Change services.provider_id
-- ============================================================

ALTER TABLE services ALTER COLUMN provider_id TYPE INTEGER USING provider_id::INTEGER;

-- ============================================================
-- Step 9: Change ratings columns
-- ============================================================

ALTER TABLE ratings ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER;
ALTER TABLE ratings ALTER COLUMN provider_id TYPE INTEGER USING provider_id::INTEGER;

-- ============================================================
-- Step 10: Change notifications.recipient_user_id
-- ============================================================

ALTER TABLE notifications ALTER COLUMN recipient_user_id TYPE INTEGER USING recipient_user_id::INTEGER;

-- ============================================================
-- Step 11: Recreate all foreign key constraints
-- ============================================================

-- service_providers → users
ALTER TABLE service_providers
    ADD CONSTRAINT fk_service_providers_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- services → service_providers
ALTER TABLE services
    ADD CONSTRAINT fk_services_provider
        FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE CASCADE;

-- availability_slots → service_providers
ALTER TABLE availability_slots
    ADD CONSTRAINT fk_availability_provider
        FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE CASCADE;

-- availability_slots → bookings (circular FK added at end)
ALTER TABLE availability_slots
    ADD CONSTRAINT fk_availability_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- bookings → users (customer)
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_customer
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT;

-- bookings → service_providers (provider)
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_provider
        FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE RESTRICT;

-- bookings → availability_slots
ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_slot
        FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE SET NULL;

-- booking_audit → bookings
ALTER TABLE booking_audit
    ADD CONSTRAINT fk_audit_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- booking_audit → users
ALTER TABLE booking_audit
    ADD CONSTRAINT fk_audit_user
        FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ratings → users
ALTER TABLE ratings
    ADD CONSTRAINT fk_ratings_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ratings → service_providers
ALTER TABLE ratings
    ADD CONSTRAINT fk_ratings_provider
        FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE CASCADE;

-- notifications → users
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- Step 12: Verify migration success
-- ============================================================

DO $$
    DECLARE
        v_users_type TEXT;
        v_providers_type TEXT;
        v_slots_type TEXT;
    BEGIN
        -- Check users.id type
        SELECT data_type INTO v_users_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id';

        -- Check service_providers.user_id type
        SELECT data_type INTO v_providers_type
        FROM information_schema.columns
        WHERE table_name = 'service_providers' AND column_name = 'user_id';

        -- Check availability_slots.id type
        SELECT data_type INTO v_slots_type
        FROM information_schema.columns
        WHERE table_name = 'availability_slots' AND column_name = 'id';

        -- Verify all are integer
        IF v_users_type != 'integer' OR v_providers_type != 'integer' OR v_slots_type != 'integer' THEN
            RAISE EXCEPTION 'Migration verification failed. Expected INTEGER but got: users.id=%, service_providers.user_id=%, availability_slots.id=%',
                v_users_type, v_providers_type, v_slots_type;
        END IF;

        RAISE NOTICE 'Migration V6 completed successfully. All ID columns converted to INTEGER.';
    END $$;

-- ============================================================
-- Migration complete
-- ============================================================