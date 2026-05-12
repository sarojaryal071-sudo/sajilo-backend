-- 018_create_moderation_actions.sql
-- Phase 13B – Moderation Foundation

CREATE TABLE IF NOT EXISTS moderation_actions (
  id              SERIAL PRIMARY KEY,
  actor_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  target_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role     VARCHAR(20) NOT NULL,          -- 'worker' or 'customer'
  action          VARCHAR(20) NOT NULL,          -- 'suspend', 'unsuspend', 'flag_review'
  previous_status VARCHAR(20),                   -- status before the action
  new_status      VARCHAR(20) NOT NULL,          -- resulting moderation status
  note            TEXT,                          -- admin's reason / explanation
  metadata        JSONB,                         -- extra context (IP, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_target ON moderation_actions (target_id, target_role);
CREATE INDEX IF NOT EXISTS idx_mod_actor  ON moderation_actions (actor_id);
CREATE INDEX IF NOT EXISTS idx_mod_created ON moderation_actions (created_at DESC);