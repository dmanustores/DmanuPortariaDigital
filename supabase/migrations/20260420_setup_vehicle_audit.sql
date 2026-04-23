
-- Migration: Setup Vehicle Audit and Interactions
-- Date: 2026-04-20

-- 1. Add operator_id to vehicles_registry if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'vehicles_registry' AND COLUMN_NAME = 'operador_id') THEN
        ALTER TABLE vehicles_registry ADD COLUMN operador_id UUID REFERENCES operators(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create vehicle_interactions table for Timeline/History
CREATE TABLE IF NOT EXISTS vehicle_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles_registry(id) ON DELETE CASCADE,
    operador_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL, -- 'CRIACAO', 'ENTRADA', 'SAIDA', 'ARQUIVAMENTO', 'REABERTURA', 'EDICAO'
    mensagem TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE vehicle_interactions ENABLE ROW LEVEL SECURITY;

-- 4. Basic RLS Policy
CREATE POLICY "Allow all for authenticated on interactions" 
ON vehicle_interactions FOR ALL 
TO authenticated 
USING (true);

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_interactions_vehicle_id ON vehicle_interactions(vehicle_id);

-- ✅ Vehicle Audit structure updated
