-- Migration: Add isBaby field to household_members table

ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS isBaby BOOLEAN DEFAULT false;

COMMENT ON COLUMN household_members.isBaby IS 'Flag indicating if member is a baby without documents (CPF/RG)';

-- Create index on resident_id for better query performance
CREATE INDEX IF NOT EXISTS idx_household_isBaby ON household_members(isBaby);
