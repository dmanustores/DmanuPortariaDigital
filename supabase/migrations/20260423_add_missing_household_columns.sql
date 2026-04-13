-- Migration: Add missing columns to household_members table

ALTER TABLE household_members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ATIVO',
ADD COLUMN IF NOT EXISTS isBaby BOOLEAN DEFAULT false;

COMMENT ON COLUMN household_members.status IS 'Status do dependente: ATIVO, INATIVO, etc';
COMMENT ON COLUMN household_members.isBaby IS 'Flag indicando se é bebê sem documentos';
