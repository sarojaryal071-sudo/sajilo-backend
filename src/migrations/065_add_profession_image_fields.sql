-- Add Cloudinary image support to professions (service categories)
-- Keep existing emoji icon column as fallback
ALTER TABLE professions
ADD COLUMN IF NOT EXISTS icon_image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS icon_image_public_id VARCHAR(255);