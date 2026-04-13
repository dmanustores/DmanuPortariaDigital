-- Migration: Disable RLS on residents table for development
-- This allows public read access to residents during development phase
-- TODO: Re-enable and configure proper RLS policies for production

ALTER TABLE residents DISABLE ROW LEVEL SECURITY;

-- ✅ RLS disabled on residents table
-- Residents can now be read publicly
-- This is intended for development phase only
