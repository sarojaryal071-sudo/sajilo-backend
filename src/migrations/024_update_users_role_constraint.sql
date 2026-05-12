-- 024_update_users_role_constraint.sql
-- Allow the new staff roles moderator and support_agent

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'worker', 'admin', 'moderator', 'support_agent'));