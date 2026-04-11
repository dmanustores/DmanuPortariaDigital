-- Migration to add CPF to household members table

ALTER TABLE IF EXISTS household_members 
ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Update comments for clarity
COMMENT ON COLUMN household_members.cpf IS 'CPF of the household member (optional)';
