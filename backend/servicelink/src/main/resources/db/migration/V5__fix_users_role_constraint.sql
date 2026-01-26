-- Drop the old constraint (from V1)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the corrected constraint (uppercase values)
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('USER', 'SERVICE_PROVIDER', 'ADMIN'));