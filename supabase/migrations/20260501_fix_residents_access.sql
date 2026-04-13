-- Migration: Fix residents table access for development
-- This removes all RLS blocking and ensures public read access

-- Drop all existing policies on residents
DROP POLICY IF EXISTS "Everyone can read residents" ON residents;
DROP POLICY IF EXISTS "Admins manage residents" ON residents;

-- Disable RLS completely
ALTER TABLE residents DISABLE ROW LEVEL SECURITY;

-- Verify data exists
SELECT 'Total residents in database:' as info, COUNT(*) as count FROM residents;

-- ✅ Residents table is now fully accessible for development
