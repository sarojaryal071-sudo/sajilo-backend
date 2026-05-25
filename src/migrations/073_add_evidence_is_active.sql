-- V073: Soft-delete for dispute evidences (is_active flag)
ALTER TABLE dispute_evidences ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;