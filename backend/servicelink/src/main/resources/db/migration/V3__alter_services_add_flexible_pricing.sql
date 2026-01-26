-- Add pricing_type column
ALTER TABLE services
    ADD COLUMN pricing_type VARCHAR(20) NOT NULL DEFAULT 'HOURLY'
        CHECK (pricing_type IN ('HOURLY', 'FIXED', 'RANGE'));

-- Make hourly_rate nullable and remove NOT NULL constraint
ALTER TABLE services
    ALTER COLUMN hourly_rate DROP NOT NULL;

-- Add new pricing fields
ALTER TABLE services
    ADD COLUMN fixed_price DECIMAL(10, 2),
    ADD COLUMN min_price DECIMAL(10, 2),
    ADD COLUMN max_price DECIMAL(10, 2);

-- Add index for price-based searches
CREATE INDEX idx_services_category_price ON services(
                                                     category_id,
                                                     is_active,
                                                     COALESCE(fixed_price, min_price, hourly_rate)
    );

-- Add composite index for category + active filtering
CREATE INDEX idx_services_category_active ON services(category_id, is_active);