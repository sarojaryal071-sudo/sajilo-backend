-- Seed: default accounting accounts
-- Idempotent – uses ON CONFLICT DO NOTHING

INSERT INTO accounts (id, code, name, type) VALUES
    ('d290f1ee-6c54-4b01-90e6-d701748f0851', 'CASH',              'Cash',              'ASSET'),
    ('a7c0a1e8-7c6a-4b0d-a6e3-f9a72e2d7f1b', 'PLATFORM_REVENUE',  'Platform Revenue',  'INCOME'),
    ('d4c8be1c-8ad0-4e91-96f2-bac1d2a76b3e', 'WORKER_PAYABLE',    'Worker Payable',    'LIABILITY'),
    ('b5e5d5f0-1a2b-4c3d-9e0f-8d7c6b5a4e3d', 'CUSTOMER_PAYABLE',  'Customer Payable',  'LIABILITY'),
    ('e6f7b8c9-0a1b-4c2d-8e3f-1a2b3c4d5e6f', 'COMMISSION_INCOME', 'Commission Income', 'INCOME'),
    ('f3a2b1c0-4d5e-6f7a-8b9c-0d1e2f3a4b5c', 'REFUND',            'Refund',            'EXPENSE'),
    ('c9d8e7f6-5a4b-3c2d-1e0f-9a8b7c6d5e4f', 'ADJUSTMENT',        'Adjustment',        'EQUITY')
ON CONFLICT (code) DO NOTHING;