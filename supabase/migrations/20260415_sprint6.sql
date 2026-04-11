-- Sprint 6: Relatórios + Shift Handovers table
-- Creates shift_handovers table for proper tracking of shift handovers

-- First ensure operators table exists (from previous migrations)
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Porteiro',
  turno TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create shift_handovers table
CREATE TABLE IF NOT EXISTS shift_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id),
  shift_start TIMESTAMP NOT NULL,
  shift_end TIMESTAMP DEFAULT NOW(),
  visitors_inside TEXT,
  pending_packages TEXT,
  open_occurrences TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add shift_handovers reference to operators for easier querying
ALTER TABLE operators ADD COLUMN IF NOT EXISTS current_shift_start TIMESTAMP;

-- Enable RLS
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-run)
DROP POLICY IF EXISTS "View own shifts" ON shift_handovers;
DROP POLICY IF EXISTS "Admins view all shifts" ON shift_handovers;
DROP POLICY IF EXISTS "Zelador view all shifts" ON shift_handovers;

-- Policy for viewing shift handovers
CREATE POLICY "View own shifts" ON shift_handovers FOR SELECT
  USING (operator_id IN (
    SELECT id FROM operators WHERE id = auth.uid()
  ));

CREATE POLICY "Admins view all shifts" ON shift_handovers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM operators 
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Zelador view all shifts" ON shift_handovers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM operators 
      WHERE id = auth.uid() AND role = 'Zelador'
    )
  );

-- Insert sample data for testing (only if an admin exists)
-- Use DO block to handle case where no admin exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM operators WHERE role = 'Admin' LIMIT 1) THEN
    INSERT INTO shift_handovers (operator_id, shift_start, visitors_inside, pending_packages, open_occurrences, notes)
    SELECT 
      id,
      NOW() - INTERVAL '8 hours',
      'Nenhum',
      'Apt 101, Apt 202',
      'Nenhuma',
      'Teste de registro'
    FROM operators WHERE role = 'Admin' LIMIT 1;
  END IF;
END $$;