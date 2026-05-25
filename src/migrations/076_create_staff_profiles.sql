-- V076: Staff operational profiles (separate from auth/users)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_code              VARCHAR(20) NOT NULL UNIQUE,
  full_name               VARCHAR(255),
  display_name            VARCHAR(100),
  phone                   VARCHAR(30),
  alternate_phone         VARCHAR(30),
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(30),
  address                 TEXT,
  citizenship_number      VARCHAR(50),
  citizenship_front_url   TEXT,
  citizenship_back_url    TEXT,
  profile_photo_url       TEXT,
  profile_photo_public_id VARCHAR(255),
  joining_date            DATE,
  employment_type         VARCHAR(20) DEFAULT 'full_time',   -- full_time, contract, temporary, intern
  department              VARCHAR(100),
  designation             VARCHAR(100),
  status                  VARCHAR(20) DEFAULT 'active',      -- active, suspended, inactive, resigned, terminated
  notes                   TEXT,
  created_by              INTEGER REFERENCES users(id),
  last_active_at          TIMESTAMPTZ,
  terminated_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);