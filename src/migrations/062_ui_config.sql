CREATE TABLE IF NOT EXISTS ui_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),   -- only one row allowed
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert the default row if it doesn't exist
INSERT INTO ui_config (id, config)
VALUES (1, '{"theme":"default","motion":"subtle","elevation":"soft","roles":{}}')
ON CONFLICT (id) DO NOTHING;