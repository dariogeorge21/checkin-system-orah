-- =============================================================================
-- Migration: 004_tickets_scanner_support.sql
-- Description: Adds RLS policies and performance indexes for tickets table
--              to support fast QR code scanner lookups at the check-in desk.
--
-- Supabase Dashboard -> SQL Editor -> Run
-- =============================================================================

-- 1. Ensure tickets table has RLS enabled
ALTER TABLE IF EXISTS public.tickets ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated front-desk staff to read tickets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tickets' AND policyname = 'Authenticated users can view tickets'
  ) THEN
    CREATE POLICY "Authenticated users can view tickets"
      ON public.tickets FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 3. Indexes for fast ticket scanning lookups
CREATE INDEX IF NOT EXISTS tickets_id_idx ON public.tickets (id);
CREATE INDEX IF NOT EXISTS tickets_registration_id_idx ON public.tickets (registration_id);

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
