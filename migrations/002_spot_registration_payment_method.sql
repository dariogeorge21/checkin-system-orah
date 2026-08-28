-- =============================================================================
-- Migration: 002_spot_registration_payment_method.sql
-- Description: Adds payment_method enum and column to checkins table,
--              updates checkin_details view, and ensures desk volunteer RLS.
--
-- Manual Approval:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard/project/eflmphudusmazazqutve)
-- 2. Navigate to SQL Editor
-- 3. Paste this script and click "Run"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. payment_method enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('CASH', 'UPI');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Add payment_method column to checkins table
-- ---------------------------------------------------------------------------
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS payment_method payment_method;

-- ---------------------------------------------------------------------------
-- 3. Update checkin_details view to expose payment_method
--    (Drop first because Postgres does not allow changing column order with CREATE OR REPLACE VIEW)
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

-- ---------------------------------------------------------------------------
-- 4. RLS for registrations: Ensure authenticated users can insert spot registrations
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'registrations' AND policyname = 'Authenticated users can insert registrations'
  ) THEN
    CREATE POLICY "Authenticated users can insert registrations"
      ON public.registrations FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
