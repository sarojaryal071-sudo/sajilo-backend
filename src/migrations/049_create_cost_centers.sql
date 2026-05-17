-- 049_create_cost_centers.sql
CREATE TABLE IF NOT EXISTS cost_centers (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Seed default cost centers
INSERT INTO cost_centers (code, name, description) VALUES
    ('PLATFORM_OPERATIONS', 'Platform Operations', 'Core marketplace operations'),
    ('PAYMENT_PROCESSING', 'Payment Processing', 'Payment gateway fees and processing'),
    ('INFRASTRUCTURE', 'Infrastructure', 'Servers, hosting, network'),
    ('WORKER_OPERATIONS', 'Worker Operations', 'Worker tools, benefits, payouts'),
    ('MARKETING', 'Marketing', 'Ads, promotions, campaigns'),
    ('GENERAL_ADMIN', 'General Admin', 'Office, salaries, miscellaneous')
ON CONFLICT (code) DO NOTHING;