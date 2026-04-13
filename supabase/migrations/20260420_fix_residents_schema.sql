-- Migration: Add missing fields to residents table

-- Add missing columns to residents table
ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS apto TEXT,
ADD COLUMN IF NOT EXISTS dataSaida TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add moradorId to vehicles if not exists
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES residents(id) ON DELETE CASCADE;

-- Add missing columns to household_members
ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ATIVO';

-- Create index for better queries
CREATE INDEX IF NOT EXISTS idx_residents_bloco_apto ON residents(bloco, apto);
CREATE INDEX IF NOT EXISTS idx_vehicles_resident ON vehicles(resident_id);
CREATE INDEX IF NOT EXISTS idx_household_resident ON household_members(resident_id);

-- Update existing residents - set apto from numero if numero exists
UPDATE residents SET apto = numero WHERE apto IS NULL AND numero IS NOT NULL;
