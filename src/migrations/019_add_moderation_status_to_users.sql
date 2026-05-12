-- 019_add_moderation_status_to_users.sql
-- Add moderation_status column to users (Phase 13B)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'active';