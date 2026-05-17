-- Seed: default accounting mapping rules
INSERT INTO account_mapping_rules (id, event_type, debit_account, credit_account, is_active) VALUES
    ('e1a2b3c4-5d6e-7f80-9a0b-1c2d3e4f5a6b', 'BOOKING_PAYMENT', 'CUSTOMER_PAYABLE', 'PLATFORM_REVENUE', TRUE),
    ('f2a3b4c5-6d7e-8f90-1a2b-3c4d5e6f7a8b', 'WORKER_PAYOUT',   'PLATFORM_REVENUE', 'WORKER_PAYABLE', TRUE),
    ('a3b4c5d6-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'REFUND',           'PLATFORM_REVENUE', 'CASH', TRUE)
ON CONFLICT (id) DO NOTHING;