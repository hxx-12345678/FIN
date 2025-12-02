-- Add updated_at column to connectors table if it doesn't exist
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

-- Create a trigger to automatically update updated_at on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_connectors_updated_at ON "connectors";
CREATE TRIGGER update_connectors_updated_at
    BEFORE UPDATE ON "connectors"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

