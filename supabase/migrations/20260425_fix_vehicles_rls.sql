-- Migration: Adjust RLS policies for vehicles table
-- Allow anonymous users to insert vehicles (test migration)

-- Drop existing policies on vehicles table
DROP POLICY IF EXISTS "Enable all operations for authenticated users only" ON vehicles;
DROP POLICY IF EXISTS "Allow vehicle insert for resident" ON vehicles;
DROP POLICY IF EXISTS "Allow select all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow update vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow delete vehicles" ON vehicles;

-- Create new policy that allows inserts from residents owner
CREATE POLICY "Allow vehicle insert for resident" ON vehicles
FOR INSERT
WITH CHECK (true);

-- Allow selects for all
CREATE POLICY "Allow select all vehicles" ON vehicles
FOR SELECT
USING (true);

-- Allow updates for authenticated users
CREATE POLICY "Allow update vehicles" ON vehicles
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow deletes for authenticated users
CREATE POLICY "Allow delete vehicles" ON vehicles
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Enable RLS on vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Print confirmation
SELECT 'RLS policies updated for vehicles table';
