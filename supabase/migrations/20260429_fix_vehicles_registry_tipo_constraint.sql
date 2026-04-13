-- Migration: Fix vehicles_registry tipo check constraint (with data cleanup)
-- Reason: The old constraint only accepted 'PROPRIETARIO' and 'MORADOR'
-- We need to accept 'LOCATARIO' and remove invalid 'MORADOR' entries
-- Date: 2026-04-13

-- Step 1: Delete invalid rows that don't match the new constraint
DELETE FROM vehicles_registry 
WHERE tipo NOT IN ('PROPRIETARIO', 'LOCATARIO');

-- Step 2: Drop the old restrictive constraint
ALTER TABLE vehicles_registry DROP CONSTRAINT IF EXISTS vehicles_registry_tipo_check;

-- Step 3: Add new constraint that accepts both PROPRIETARIO and LOCATARIO
ALTER TABLE vehicles_registry 
ADD CONSTRAINT vehicles_registry_tipo_check 
CHECK (tipo IN ('PROPRIETARIO', 'LOCATARIO'));

-- ✅ Database cleaned and constraint updated
-- Now vehicles_registry only accepts PROPRIETARIO and LOCATARIO types
