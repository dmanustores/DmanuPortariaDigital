-- Migration: Allow NULL values for rg and cpf in household_members (for babies)

ALTER TABLE household_members
ALTER COLUMN rg DROP NOT NULL,
ALTER COLUMN cpf DROP NOT NULL;

COMMENT ON COLUMN household_members.rg IS 'RG do dependente (puede ser NULL para bebês sem documentos)';
COMMENT ON COLUMN household_members.cpf IS 'CPF do dependente (pode ser NULL para bebês sem documentos)';
