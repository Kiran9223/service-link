-- =====================================================
-- ServiceLink Database Schema
-- Version: 1.0
-- Description: Initial schema with all tables
-- =====================================================

-- =====================================================
-- Table: users
-- Description: Central table for all platform users
-- =====================================================
CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,

    -- Basic info
                       name VARCHAR(100) NOT NULL,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       phone VARCHAR(20),

    -- Location
                       city VARCHAR(100),
                       state VARCHAR(50),
                       country VARCHAR(50) DEFAULT 'USA',
                       postal_code VARCHAR(20),
                       latitude DECIMAL(10, 8),
                       longitude DECIMAL(11, 8),

    -- Role and status
                       role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'service_provider', 'admin')),
                       is_active BOOLEAN DEFAULT TRUE,
                       email_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       last_login_at TIMESTAMP
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(latitude, longitude);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- =====================================================
-- Table: service_providers
-- Description: Provider-specific business information
-- =====================================================
CREATE TABLE service_providers (
                                   user_id BIGINT PRIMARY KEY,

    -- Business info
                                   business_name VARCHAR(255) NOT NULL,
                                   description TEXT,

    -- Qualifications
                                   years_of_experience INTEGER CHECK (years_of_experience >= 0),
                                   is_certified BOOLEAN DEFAULT FALSE,
                                   is_insured BOOLEAN DEFAULT FALSE,

    -- Service area
                                   service_radius_miles INTEGER NOT NULL DEFAULT 25 CHECK (service_radius_miles > 0),

    -- Performance metrics
                                   overall_rating DECIMAL(3, 2) CHECK (overall_rating >= 0 AND overall_rating <= 5.00),
                                   total_bookings_completed INTEGER DEFAULT 0,

    -- Photos
                                   profile_photo_url VARCHAR(500),
                                   business_photos TEXT,

    -- Timestamps
                                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
                                   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for service_providers table
CREATE INDEX idx_providers_rating ON service_providers(overall_rating);
CREATE INDEX idx_providers_created ON service_providers(created_at);
CREATE INDEX idx_providers_bookings ON service_providers(total_bookings_completed);

-- =====================================================
-- Table: service_categories
-- Description: Lookup table for service types
-- =====================================================
CREATE TABLE service_categories (
                                    id BIGSERIAL PRIMARY KEY,
                                    name VARCHAR(100) UNIQUE NOT NULL,
                                    description TEXT,
                                    is_active BOOLEAN DEFAULT TRUE,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for service_categories table
CREATE INDEX idx_categories_active ON service_categories(is_active);

-- =====================================================
-- Table: services
-- Description: Individual service offerings by providers
-- =====================================================
CREATE TABLE services (
                          id BIGSERIAL PRIMARY KEY,
                          provider_id BIGINT NOT NULL,
                          category_id BIGINT NOT NULL,

    -- Service details
                          service_name VARCHAR(255) NOT NULL,
                          description TEXT,

    -- Pricing (hourly model)
                          hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate > 0),

    -- Duration
                          estimated_duration_hours DECIMAL(3, 1),

    -- Status
                          is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
                          FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE CASCADE,
                          FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT
);

-- Indexes for services table
CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_services_provider_category ON services(provider_id, category_id);

-- =====================================================
-- Table: availability_slots
-- Description: Provider availability (10-day rolling window)
-- =====================================================
CREATE TABLE availability_slots (
                                    id BIGSERIAL PRIMARY KEY,
                                    provider_id BIGINT NOT NULL,

    -- Time slot
                                    slot_date DATE NOT NULL,
                                    start_time TIME NOT NULL,
                                    end_time TIME NOT NULL,

    -- Status
                                    is_available BOOLEAN DEFAULT TRUE,
                                    is_booked BOOLEAN DEFAULT FALSE,
                                    booking_id BIGINT,

    -- Timestamps
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
                                    FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE CASCADE,

    -- Constraints
                                    CHECK (end_time > start_time),
                                    CHECK (slot_date >= CURRENT_DATE),
                                    CHECK (slot_date <= CURRENT_DATE + INTERVAL '10 days')
    );

-- Indexes for availability_slots table
CREATE INDEX idx_availability_provider ON availability_slots(provider_id);
CREATE INDEX idx_availability_date ON availability_slots(slot_date);
CREATE INDEX idx_availability_provider_date ON availability_slots(provider_id, slot_date);
CREATE INDEX idx_availability_status ON availability_slots(is_available, is_booked);
CREATE UNIQUE INDEX idx_availability_no_overlap ON availability_slots(provider_id, slot_date, start_time);

-- =====================================================
-- Table: bookings
-- Description: Core transaction table
-- =====================================================
CREATE TABLE bookings (
                          id BIGSERIAL PRIMARY KEY,

    -- Parties involved
                          customer_id BIGINT NOT NULL,
                          provider_id BIGINT NOT NULL,
                          service_id BIGINT NOT NULL,
                          slot_id BIGINT,

    -- Scheduled time
                          scheduled_date DATE NOT NULL,
                          scheduled_start_time TIME NOT NULL,
                          scheduled_end_time TIME NOT NULL,
                          duration_hours DECIMAL(3, 1),

    -- Actual time (filled when service happens)
                          actual_start_time TIMESTAMP,
                          actual_end_time TIMESTAMP,

    -- Service location
                          service_address TEXT NOT NULL,
                          service_city VARCHAR(100),
                          service_state VARCHAR(50),
                          service_postal_code VARCHAR(20),
                          service_latitude DECIMAL(10, 8),
                          service_longitude DECIMAL(11, 8),

    -- Pricing
                          total_price DECIMAL(10, 2) NOT NULL,

    -- Status and instructions
                          status VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
                          special_instructions TEXT,

    -- Cancellation
                          cancellation_reason TEXT,
                          cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('customer', 'provider', 'admin')),

    -- Timestamps
                          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          confirmed_at TIMESTAMP,
                          completed_at TIMESTAMP,
                          cancelled_at TIMESTAMP,

    -- Foreign keys
                          FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
                          FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE RESTRICT,
                          FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
                          FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE SET NULL
);

-- Indexes for bookings table
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX idx_bookings_provider_status ON bookings(provider_id, status);
CREATE INDEX idx_bookings_customer_status ON bookings(customer_id, status);

-- =====================================================
-- Table: booking_audit
-- Description: Immutable log of all booking changes
-- =====================================================
CREATE TABLE booking_audit (
                               id BIGSERIAL PRIMARY KEY,
                               booking_id BIGINT NOT NULL,

    -- What happened
                               action VARCHAR(50) NOT NULL CHECK (action IN (
                                   'booking_created',
                                   'booking_confirmed',
                                   'booking_started',
                                   'booking_completed',
                                   'booking_cancelled',
                                   'status_changed',
                                   'price_changed',
                                   'schedule_changed',
                                   'instructions_updated',
                                   'no_show_recorded'
                                   )),

    -- Change details
    old_value TEXT,
    new_value TEXT,

    -- Who and when
    performed_by_user_id BIGINT,
    performed_by_role VARCHAR(20) CHECK (performed_by_role IN ('customer', 'provider', 'admin', 'system')),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Additional context
    comments TEXT,

    -- Foreign keys
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for booking_audit table
CREATE INDEX idx_audit_booking ON booking_audit(booking_id);
CREATE INDEX idx_audit_user ON booking_audit(performed_by_user_id);
CREATE INDEX idx_audit_action ON booking_audit(action);
CREATE INDEX idx_audit_time ON booking_audit(performed_at);

-- =====================================================
-- Table: ratings
-- Description: Customer reviews of providers
-- =====================================================
CREATE TABLE ratings (
                         id BIGSERIAL PRIMARY KEY,
                         booking_id BIGINT UNIQUE NOT NULL,

    -- Who and who
                         user_id BIGINT NOT NULL,
                         provider_id BIGINT NOT NULL,

    -- Review content
                         stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
                         review_text TEXT,

    -- Provider response
                         provider_response TEXT,
                         provider_responded_at TIMESTAMP,

    -- Visibility
                         is_visible BOOLEAN DEFAULT TRUE,

    -- Timestamps
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
                         FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                         FOREIGN KEY (provider_id) REFERENCES service_providers(user_id) ON DELETE CASCADE
);

-- Indexes for ratings table
CREATE INDEX idx_ratings_provider ON ratings(provider_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_ratings_booking ON ratings(booking_id);
CREATE INDEX idx_ratings_stars ON ratings(stars);
CREATE INDEX idx_ratings_created ON ratings(created_at);
CREATE INDEX idx_ratings_visible ON ratings(is_visible);

-- =====================================================
-- Table: notifications
-- Description: Track all notifications sent to users
-- =====================================================
CREATE TABLE notifications (
                               id BIGSERIAL PRIMARY KEY,

    -- Recipients and context
                               recipient_user_id BIGINT NOT NULL,
                               booking_id BIGINT,

    -- Notification details
                               notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
                                                                                                   'booking_confirmation',
                                                                                                   'booking_reminder',
                                                                                                   'booking_completion',
                                                                                                   'review_request',
                                                                                                   'new_message',
                                                                                                   'welcome_email',
                                                                                                   'password_reset',
                                                                                                   'account_suspended'
                                   )),

    -- Content
                               subject VARCHAR(255),
                               message TEXT NOT NULL,

    -- Delivery
                               channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
                               status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),

    -- Tracking
                               external_id VARCHAR(255),
                               error_message TEXT,
                               retry_count INTEGER DEFAULT 0,

    -- Timestamps
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               sent_at TIMESTAMP,
                               delivered_at TIMESTAMP,
                               failed_at TIMESTAMP,

    -- Foreign keys
                               FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
                               FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Indexes for notifications table
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Trigger: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at BEFORE UPDATE ON service_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update provider rating when review added/updated
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
UPDATE service_providers
SET overall_rating = (
    SELECT ROUND(AVG(stars)::NUMERIC, 2)
    FROM ratings
    WHERE provider_id = NEW.provider_id
      AND is_visible = TRUE
)
WHERE user_id = NEW.provider_id;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rating_changed
    AFTER INSERT OR UPDATE ON ratings
                        FOR EACH ROW
                        EXECUTE FUNCTION update_provider_rating();

-- Trigger: Increment booking counter when booking completed
CREATE OR REPLACE FUNCTION increment_booking_counter()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND
       (OLD.status IS NULL OR OLD.status != 'completed') THEN
UPDATE service_providers
SET total_bookings_completed = total_bookings_completed + 1
WHERE user_id = NEW.provider_id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_completed
    AFTER INSERT OR UPDATE ON bookings
                        FOR EACH ROW
                        EXECUTE FUNCTION increment_booking_counter();

-- Trigger: Add foreign key constraint to availability_slots.booking_id
ALTER TABLE availability_slots
    ADD CONSTRAINT fk_availability_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- =====================================================
-- Initial Comments
-- =====================================================

COMMENT ON TABLE users IS 'Central table for all platform users (customers, providers, admins)';
COMMENT ON TABLE service_providers IS 'Provider-specific business information and metrics';
COMMENT ON TABLE service_categories IS 'Lookup table for service types (Plumbing, Electrical, etc.)';
COMMENT ON TABLE services IS 'Individual service offerings by providers';
COMMENT ON TABLE availability_slots IS 'Provider availability with 10-day rolling window';
COMMENT ON TABLE bookings IS 'Core transaction table connecting customers with providers';
COMMENT ON TABLE booking_audit IS 'Immutable audit trail of all booking changes';
COMMENT ON TABLE ratings IS 'Customer reviews and provider ratings';
COMMENT ON TABLE notifications IS 'Track all notifications sent across channels';

-- =====================================================
-- Schema initialization complete
-- =====================================================