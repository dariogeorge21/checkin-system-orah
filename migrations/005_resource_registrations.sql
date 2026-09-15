-- =============================================================================
-- Migration: 005_resource_registrations.sql
-- Description: Creates resource_registrations table for resource persons/speakers.
--              Resource registrations are always on-spot with NO FEE COLLECTION.
--              Includes fields: name, phone (optional), from_location (optional),
--              session (optional), registration_type ('SPOT'), is_checked_in,
--              checked_in_at, checked_in_by, and notes.
--
-- Manual Application:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this script and click "Run"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure resource_registrations table exists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_registrations (
  id                uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid              NOT NULL,
  name              text              NOT NULL,
  phone             text,
  from_location     text,
  session           text,
  registration_type text              NOT NULL DEFAULT 'SPOT',
  is_checked_in     boolean           NOT NULL DEFAULT true,
  checked_in_at     timestamptz       DEFAULT now(),
  checked_in_by     uuid              REFERENCES auth.users(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz       NOT NULL DEFAULT now(),
  updated_at        timestamptz       NOT NULL DEFAULT now()
);

-- Ensure all columns exist in case table was created with an earlier partial definition
ALTER TABLE public.resource_registrations
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS from_location text,
  ADD COLUMN IF NOT EXISTS session text,
  ADD COLUMN IF NOT EXISTS registration_type text DEFAULT 'SPOT',
  ADD COLUMN IF NOT EXISTS is_checked_in boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS checked_in_by uuid,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ---------------------------------------------------------------------------
-- 2. Auto-update updated_at on row modifications
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resource_registrations_updated_at ON public.resource_registrations;
CREATE TRIGGER resource_registrations_updated_at
  BEFORE UPDATE ON public.resource_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Indexes for fast front-desk lookups
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS resource_registrations_event_id_idx 
  ON public.resource_registrations (event_id);

CREATE INDEX IF NOT EXISTS resource_registrations_name_idx 
  ON public.resource_registrations (name);

CREATE INDEX IF NOT EXISTS resource_registrations_phone_idx 
  ON public.resource_registrations (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS resource_registrations_session_idx 
  ON public.resource_registrations (session)
  WHERE session IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security (RLS) policies for desk volunteers
-- ---------------------------------------------------------------------------
ALTER TABLE public.resource_registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can select resource_registrations'
  ) THEN
    CREATE POLICY "Authenticated users can select resource_registrations"
      ON public.resource_registrations FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can insert resource_registrations'
  ) THEN
    CREATE POLICY "Authenticated users can insert resource_registrations"
      ON public.resource_registrations FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can update resource_registrations'
  ) THEN
    CREATE POLICY "Authenticated users can update resource_registrations"
      ON public.resource_registrations FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can delete resource_registrations'
  ) THEN
    CREATE POLICY "Authenticated users can delete resource_registrations"
      ON public.resource_registrations FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- END OF MIGRATION 005
-- =============================================================================

