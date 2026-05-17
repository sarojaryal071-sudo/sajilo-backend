-- 055_create_control_alerts.sql
CREATE TABLE IF NOT EXISTS control_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type      VARCHAR(50) NOT NULL,          -- EXPENSE_SPIKE_ALERT, VENDOR_ANOMALY_ALERT, etc.
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH')),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    source          VARCHAR(100),
    evidence        JSONB,
    anomaly_hash    VARCHAR(64) UNIQUE NOT NULL,   -- prevents duplicate alerts
    status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ACKNOWLEDGED')),
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);