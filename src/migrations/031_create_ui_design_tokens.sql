-- Phase 19A: UI Configuration Engine
-- Table: ui_design_tokens
-- Stores individual token values per scope

CREATE TABLE IF NOT EXISTS ui_design_tokens (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(30) NOT NULL,
  token_category VARCHAR(50) NOT NULL,
  token_key VARCHAR(50) NOT NULL,
  token_value VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_scope_token UNIQUE (scope, token_category, token_key, version)
);

CREATE INDEX IF NOT EXISTS idx_ui_tokens_scope ON ui_design_tokens(scope);
CREATE INDEX IF NOT EXISTS idx_ui_tokens_category ON ui_design_tokens(token_category);