CREATE TABLE IF NOT EXISTS notifications (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,
  user_role       VARCHAR(20) NOT NULL DEFAULT 'customer',
  type            VARCHAR(50),
  title           VARCHAR(255) NOT NULL,
  message         TEXT,
  priority        VARCHAR(50) DEFAULT 'normal',
  target_type     VARCHAR(50),
  target_category VARCHAR(50),
  created_by      INTEGER,
  status          VARCHAR(50) DEFAULT 'sent',
  entity_type     VARCHAR(50),
  entity_id       INTEGER,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(user_role);