CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);