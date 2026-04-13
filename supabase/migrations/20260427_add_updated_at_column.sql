-- Migration: Add updated_at column to residents table

ALTER TABLE residents
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for better performance when querying by update date
CREATE INDEX IF NOT EXISTS idx_residents_updated_at ON residents(updated_at);

-- Set existing records to have updated_at = created_at if they don't have it
UPDATE residents SET updated_at = created_at WHERE updated_at IS NULL;

-- Add comment
COMMENT ON COLUMN residents.updated_at IS 'Timestamp da última atualização do registro';
