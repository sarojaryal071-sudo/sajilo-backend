-- Add display section to professions: 'primary' = Our Services, 'secondary' = Other Services
ALTER TABLE professions
ADD COLUMN IF NOT EXISTS display_section VARCHAR(20) DEFAULT 'primary';