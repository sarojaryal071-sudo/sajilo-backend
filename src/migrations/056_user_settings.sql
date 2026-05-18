-- ============================================================
-- Migration: user_settings
-- Description: Per‑user JSON settings storage
-- Run against: sajilo database (PostgreSQL)
-- ============================================================

-- Drop old table if it exists (backup data first if needed)
DROP TABLE IF EXISTS user_settings CASCADE;

CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default settings for all existing users (idempotent – ON CONFLICT DO NOTHING)
INSERT INTO user_settings (user_id, settings)
SELECT
    id,
    '{
        "account": {
            "fullName": "",
            "email": "",
            "phone": ""
        },
        "payment": {
            "bankName": "",
            "accountHolder": "",
            "accountNumber": "",
            "walletPreference": "cash"
        },
        "bookingPreferences": {
            "bookingHistoryVisibilityDays": 90,
            "autoHideCompletedBookings": false
        },
        "security": {
            "deactivateAccount": false,
            "deleteAccount": false
        },
        "legal": {
            "privacyPolicy": "",
            "terms": ""
        },
        "appInfo": {
            "version": "1.0.0",
            "build": "2026.05",
            "developer": "Sajilo"
        }
    }'::jsonb
FROM users
ON CONFLICT (user_id) DO NOTHING;