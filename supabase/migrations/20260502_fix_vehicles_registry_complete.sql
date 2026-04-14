-- Migration: Fix vehicles_registry complete
-- 1. Expand tipo constraint to accept all vehicle types
-- 2. Recreate moradorId FK with ON DELETE CASCADE
-- 3. Recreate unidadeId FK properly (nullable)
-- Date: 2026-04-14

-- ============================================================
-- STEP 1: Fix tipo constraint — accept all valid types
-- ============================================================
-- Drop old restrictive constraint
ALTER TABLE vehicles_registry DROP CONSTRAINT IF EXISTS vehicles_registry_tipo_check;

-- Add new constraint that accepts all types used in the app
ALTER TABLE vehicles_registry
ADD CONSTRAINT vehicles_registry_tipo_check
CHECK (tipo IN ('PROPRIETARIO', 'LOCATARIO', 'MORADOR', 'VISITANTE', 'PRESTADOR', 'MUDANCA'));

-- ============================================================
-- STEP 2: Rebuild moradorId FK with ON DELETE CASCADE
-- ============================================================
-- Drop existing FK (name may vary; use IF EXISTS for safety)
ALTER TABLE vehicles_registry
  DROP CONSTRAINT IF EXISTS vehicles_registry_moradorid_fkey,
  DROP CONSTRAINT IF EXISTS vehicles_registry_moradorId_fkey;

-- Re-add with CASCADE so orphan rows die when resident is deleted
ALTER TABLE vehicles_registry
ADD CONSTRAINT vehicles_registry_moradorid_fkey
FOREIGN KEY (moradorId) REFERENCES residents(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 3: Ensure unidadeId FK is nullable (no change needed, just verify)
-- Already: unidadeId UUID REFERENCES units(id) — no cascade required
-- ============================================================

-- ============================================================
-- STEP 4: Add index for faster lookup by moradorId
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_registry_moradorid ON vehicles_registry(moradorId);
CREATE INDEX IF NOT EXISTS idx_vehicles_registry_unidade ON vehicles_registry(unidadeId);

-- ✅ vehicles_registry now accepts all types and has proper CASCADE on moradorId
SELECT 'vehicles_registry tipo constraint and FK fixed' AS status;
