-- Add status column to exports table if it doesn't exist
ALTER TABLE exports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'queued';

-- Update existing records to have status
-- Check if s3_key exists (file stored in S3)
UPDATE exports SET status = 'completed' 
WHERE status IS NULL 
  AND s3_key IS NOT NULL;
UPDATE exports SET status = 'queued' WHERE status IS NULL;

