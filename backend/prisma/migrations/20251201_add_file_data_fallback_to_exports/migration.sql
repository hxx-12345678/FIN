-- Add file_data column as fallback when S3 is not available
-- This is a BYTEA column to store binary file data
ALTER TABLE "exports" ADD COLUMN IF NOT EXISTS "file_data" BYTEA;


