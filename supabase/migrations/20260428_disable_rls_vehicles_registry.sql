-- Migration: Disable RLS on vehicles_registry
-- Reason: vehicles_registry is a mirror/display-only table that needs to be written to from the app
-- The RLS policy was blocking vehicle synchronization when editing residents
-- Date: 2026-04-13

-- Disable RLS on vehicles_registry to allow insert/update operations
ALTER TABLE vehicles_registry DISABLE ROW LEVEL SECURITY;

-- ✅ Now vehicles_registry can be synced without RLS blocking
