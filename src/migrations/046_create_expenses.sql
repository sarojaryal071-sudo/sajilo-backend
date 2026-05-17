-- 046_create_expenses.sql
CREATE TABLE IF NOT EXISTS expenses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             VARCHAR(200) NOT NULL,
    category_id       UUID REFERENCES expense_categories(id),
    vendor_id         UUID REFERENCES vendors(id),
    amount            NUMERIC(12,2) NOT NULL,
    currency          VARCHAR(10) DEFAULT 'NPR',
    payment_method    VARCHAR(30) DEFAULT 'cash',      -- cash / bank / wallet / manual
    reference_number  VARCHAR(100),
    invoice_number    VARCHAR(100),
    description       TEXT,
    expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date          DATE,
    status            VARCHAR(20) DEFAULT 'draft'
                      CHECK (status IN ('draft','pending','approved','paid','cancelled')),
    receipt_url       TEXT,
    created_by        UUID,
    approved_by       UUID,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);