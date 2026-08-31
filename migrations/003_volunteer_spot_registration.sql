-- =============================================================================
-- Migration: 003_volunteer_spot_registration.sql
-- Description: Ensures volunteer_registrations and checkins support spot registration,
--              payment methods, indexes, and desk volunteer RLS policies.
--
-- Manual Application:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this script and click "Run"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure registration_type enum supports OFFLINE / ONLINE
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_type') THEN
    CREATE TYPE registration_type AS ENUM ('ONLINE', 'OFFLINE');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Ensure volunteer_registrations table exists with all required columns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_registrations (
  id                uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid              NOT NULL,
  name              text              NOT NULL,
  phone             text              NOT NULL,
  ministry          text              NOT NULL,
  role              text              NOT NULL DEFAULT 'Member',
  registration_type registration_type NOT NULL DEFAULT 'OFFLINE',
  confirmed         boolean           NOT NULL DEFAULT true,
  created_at        timestamptz       NOT NULL DEFAULT now(),
  updated_at        timestamptz       NOT NULL DEFAULT now()
);

-- Ensure columns exist in case table was created with an earlier definition
ALTER TABLE public.volunteer_registrations 
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS ministry text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'Member',
  ADD COLUMN IF NOT EXISTS registration_type registration_type DEFAULT 'OFFLINE',
  ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update updated_at on volunteer_registrations row changes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS volunteer_registrations_updated_at ON public.volunteer_registrations;
CREATE TRIGGER volunteer_registrations_updated_at
  BEFORE UPDATE ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS volunteer_registrations_event_id_idx 
  ON public.volunteer_registrations (event_id);

CREATE INDEX IF NOT EXISTS volunteer_registrations_phone_idx 
  ON public.volunteer_registrations (phone);

CREATE INDEX IF NOT EXISTS volunteer_registrations_ministry_idx 
  ON public.volunteer_registrations (ministry);

-- ---------------------------------------------------------------------------
-- 3. Ensure payment_method enum and column exist
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('CASH', 'UPI');
  END IF;
END $$;

ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS volunteer_registration_id uuid REFERENCES public.volunteer_registrations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payment_method payment_method;

-- Ensure checkin index exists for volunteer_registration_id
CREATE INDEX IF NOT EXISTS checkins_volunteer_registration_id_idx
  ON public.checkins (volunteer_registration_id)
  WHERE volunteer_registration_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Ensure RLS policies for desk volunteers
-- ---------------------------------------------------------------------------
ALTER TABLE public.volunteer_registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'volunteer_registrations' AND policyname = 'Authenticated users can select volunteer_registrations'
  ) THEN
    CREATE POLICY "Authenticated users can select volunteer_registrations"
      ON public.volunteer_registrations FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'volunteer_registrations' AND policyname = 'Authenticated users can insert volunteer_registrations'
  ) THEN
    CREATE POLICY "Authenticated users can insert volunteer_registrations"
      ON public.volunteer_registrations FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'volunteer_registrations' AND policyname = 'Authenticated users can update volunteer_registrations'
  ) THEN
    CREATE POLICY "Authenticated users can update volunteer_registrations"
      ON public.volunteer_registrations FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Checkins RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'checkins' AND policyname = 'Authenticated users can insert checkins'
  ) THEN
    CREATE POLICY "Authenticated users can insert checkins"
      ON public.checkins FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Update or recreate checkin_details view
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.checkin_details;

CREATE OR REPLACE VIEW public.checkin_details AS
SELECT
  c.id,
  c.event_id,
  c.registration_id,
  c.volunteer_registration_id,
  c.registration_option,
  c.payment_status,
  c.payment_method,
  c.amount_paid,
  c.amount_due,
  c.payment_note,
  c.checked_in_at,
  c.checked_in_by,
  c.created_at,

  -- Participant fields
  r.name              AS participant_name,
  r.phone             AS participant_phone,
  r.email             AS participant_email,
  r.parish            AS participant_parish,
  r.registration_type AS participant_registration_type,

  -- Volunteer fields
  vr.name             AS volunteer_name,
  vr.phone            AS volunteer_phone,
  vr.ministry         AS volunteer_ministry,
  vr.role             AS volunteer_role,
  vr.registration_type AS volunteer_registration_type,

  -- Resolved display fields
  COALESCE(r.name, vr.name)   AS display_name,
  COALESCE(r.phone, vr.phone) AS display_phone,
  CASE
    WHEN c.registration_id IS NOT NULL THEN 'participant'
    ELSE 'volunteer'
  END AS person_type

FROM public.checkins c
LEFT JOIN public.registrations r
  ON r.id = c.registration_id
LEFT JOIN public.volunteer_registrations vr
  ON vr.id = c.volunteer_registration_id;

-- =============================================================================
-- END OF MIGRATION 003
-- =============================================================================
