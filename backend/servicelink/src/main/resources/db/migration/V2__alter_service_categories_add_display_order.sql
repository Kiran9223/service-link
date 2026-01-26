-- Add display_order column to existing service_categories table
ALTER TABLE service_categories
    ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- Add index for active categories sorted by display order
CREATE INDEX idx_service_categories_active_order
    ON service_categories(is_active, display_order DESC);

-- Add index for name lookups (if not already exists from UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_service_categories_name
    ON service_categories(name);