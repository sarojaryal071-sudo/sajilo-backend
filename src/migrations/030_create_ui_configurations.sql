-- Phase 19A: UI Configuration Engine
-- Table: ui_configurations
-- Stores draft and published configs per scope with versioning

CREATE TABLE IF NOT EXISTS ui_configurations (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(30) NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_scope_status UNIQUE (scope, status)
);

CREATE INDEX IF NOT EXISTS idx_ui_config_scope ON ui_configurations(scope);
CREATE INDEX IF NOT EXISTS idx_ui_config_status ON ui_configurations(status);