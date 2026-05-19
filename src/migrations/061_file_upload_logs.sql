CREATE TABLE IF NOT EXISTS file_upload_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL,          -- 'profile' or 'document'
    file_url TEXT,
    action TEXT NOT NULL,             -- 'upload', 'delete', 'replace'
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);