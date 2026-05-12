-- 023_add_created_by_to_users.sql
-- Track which admin created a staff account

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;