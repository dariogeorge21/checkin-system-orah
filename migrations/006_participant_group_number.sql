-- =============================================================================
-- Migration: 006_participant_group_number.sql
-- Description: Adds group_number column to checkins table (1-15 round-robin),
--              updates checkin_details view, and backfills existing participant checkins.
--
-- Manual Approval:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard/project/eflmphudusmazazqutve)
-- 2. Navigate to SQL Editor
-- 3. Paste this script and click "Run"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add group_number column to checkins table
-- ---------------------------------------------------------------------------
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS group_number integer;

-- Add index for group lookup / reports
CREATE INDEX IF NOT EXISTS checkins_group_number_idx
  ON public.checkins (group_number)
  WHERE group_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Update checkin_details view to expose group_number
--    (Drop view first to avoid column mismatch errors)
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
  c.group_number,
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
  vr.registration_type AS volunteer_registration_type
FROM public.checkins c
LEFT JOIN public.registrations r ON r.id = c.registration_id
LEFT JOIN public.volunteer_registrations vr ON vr.id = c.volunteer_registration_id;

-- ---------------------------------------------------------------------------
-- 3. Backfill existing participant check-ins with 1-15 sequential group numbers
--    (Ordered chronologically by checked_in_at / created_at)
-- ---------------------------------------------------------------------------
WITH ordered_participants AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY COALESCE(checked_in_at, created_at) ASC) - 1 AS seq_idx
  FROM public.checkins
  WHERE registration_id IS NOT NULL AND group_number IS NULL
)
UPDATE public.checkins c
SET group_number = (ordered_participants.seq_idx % 15) + 1
FROM ordered_participants
WHERE c.id = ordered_participants.id;
