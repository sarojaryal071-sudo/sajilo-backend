-- Seed: default expense classification rules
INSERT INTO expense_classification_rules (vendor_id, category_id, keyword, expense_type, cost_center_code, priority) VALUES
    (NULL, NULL, 'internet', 'FIXED', 'INFRASTRUCTURE', 5),
    (NULL, NULL, 'hosting', 'FIXED', 'INFRASTRUCTURE', 5),
    (NULL, NULL, 'rent', 'FIXED', 'GENERAL_ADMIN', 5),
    (NULL, NULL, 'salary', 'FIXED', 'GENERAL_ADMIN', 5),
    (NULL, NULL, 'marketing', 'VARIABLE', 'MARKETING', 5),
    (NULL, NULL, 'advertisement', 'VARIABLE', 'MARKETING', 5),
    (NULL, NULL, 'gateway', 'VARIABLE', 'PAYMENT_PROCESSING', 5),
    (NULL, NULL, 'commission', 'VARIABLE', 'PLATFORM_OPERATIONS', 5),
    (NULL, NULL, 'worker', 'VARIABLE', 'WORKER_OPERATIONS', 5)
ON CONFLICT DO NOTHING; -- Note: no unique constraint, but safe to run once; we can use DO NOTHING if there's a conflict, but there isn't. We'll just run it once.