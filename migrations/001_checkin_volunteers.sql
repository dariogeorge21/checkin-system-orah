-- =============================================================================
-- Migration: 001_checkin_volunteers.sql
-- Description: Creates volunteer_registrations and checkins tables
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Ensure registration_type enum exists (shared with registrations table)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_type') THEN
    CREATE TYPE registration_type AS ENUM ('ONLINE', 'SPOT');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. volunteer_registrations
--    Minimal fields: name, phone, ministry, role (default: 'member')
--    Shares registration_type enum with registrations table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_registrations (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid          NOT NULL,
  name              text          NOT NULL,
  phone             text          NOT NULL,
  ministry          text          NOT NULL,
  role              text          NOT NULL DEFAULT 'member',
  registration_type registration_type NOT NULL DEFAULT 'ONLINE',
  confirmed         boolean       NOT NULL DEFAULT false,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row changes
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

-- RLS: enable but allow authenticated users to read/write
ALTER TABLE public.volunteer_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view volunteer_registrations"
  ON public.volunteer_registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert volunteer_registrations"
  ON public.volunteer_registrations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update volunteer_registrations"
  ON public.volunteer_registrations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. payment_status enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'not_paid',
      'partially_paid',
      'paid',
      'later_pay'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. checkins
--    Links to either registrations (participant) or volunteer_registrations.
--    Exactly one of registration_id / volunteer_registration_id must be set.
--    Stores registration_option (e.g. 'full', 'day_1', 'day_2') and full
--    payment details per CLAUDE.md spec.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                    uuid          NOT NULL,

  -- Foreign keys - exactly one should be non-null
  registration_id             uuid          REFERENCES public.registrations(id) ON DELETE CASCADE,
  volunteer_registration_id   uuid          REFERENCES public.volunteer_registrations(id) ON DELETE CASCADE,

  -- Registration option (what they signed up for)
  registration_option         text          NOT NULL DEFAULT 'full',

  -- Payment (Rs.600 standard fee per CLAUDE.md)
  payment_status              payment_status NOT NULL DEFAULT 'not_paid',
  amount_paid                 numeric(10,2) NOT NULL DEFAULT 0,
  amount_due                  numeric(10,2) NOT NULL DEFAULT 600,
  payment_note                text,

  -- Check-in audit
  checked_in_at               timestamptz,
  checked_in_by               uuid          REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),

  -- Enforce: exactly one of the two FK columns is set
  CONSTRAINT checkins_one_registration CHECK (
    (registration_id IS NOT NULL)::int + (volunteer_registration_id IS NOT NULL)::int = 1
  )
);

DROP TRIGGER IF EXISTS checkins_updated_at ON public.checkins;
CREATE TRIGGER checkins_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS checkins_registration_id_idx
  ON public.checkins (registration_id)
  WHERE registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS checkins_volunteer_registration_id_idx
  ON public.checkins (volunteer_registration_id)
  WHERE volunteer_registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS checkins_event_id_idx
  ON public.checkins (event_id);

CREATE INDEX IF NOT EXISTS checkins_payment_status_idx
  ON public.checkins (payment_status);

-- RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checkins"
  ON public.checkins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert checkins"
  ON public.checkins FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update checkins"
  ON public.checkins FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. Helpful view: checkin_details
--    Joins checkins with both registration tables for easy querying
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.checkin_details AS
SELECT
  c.id,
  c.event_id,
  c.registration_id,
  c.volunteer_registration_id,
  c.registration_option,
  c.payment_status,
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

  -- Resolved display fields (whichever is populated)
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
-- END OF MIGRATION
-- =============================================================================
