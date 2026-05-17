-- 045_create_vendors.sql
CREATE TABLE IF NOT EXISTS vendors (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code      VARCHAR(50) UNIQUE NOT NULL,
    name             VARCHAR(150) NOT NULL,
    type             VARCHAR(50),              -- service / provider / individual / company
    contact_person   VARCHAR(100),
    email            VARCHAR(100),
    phone            VARCHAR(30),
    address          TEXT,
    tax_number       VARCHAR(50),
    payment_details  JSONB,
    notes            TEXT,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);