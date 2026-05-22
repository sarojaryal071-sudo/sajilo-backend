-- 063_enforce_users_email_not_null.sql
-- Ensure the email column never allows null or empty values.
-- This prevents the "duplicate key violates unique constraint users_email_key" error
-- caused by multiple users with empty email strings.

-- 1. Replace any existing null or empty emails with a safe placeholder
UPDATE users
SET email = CONCAT('user-', id, '@placeholder.local')
WHERE email IS NULL OR email = '';

-- 2. Add NOT NULL constraint (if not already present)
ALTER TABLE users
ALTER COLUMN email SET NOT NULL;

-- 3. Add a CHECK constraint to forbid empty strings
ALTER TABLE users
ADD CONSTRAINT users_email_not_empty CHECK (email <> '');