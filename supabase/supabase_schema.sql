-- =============================================================================
-- Supabase Unified Database Schema
-- Application: Orah – Campus Meet Check-in System
-- File: supabase/supabase_schema.sql
-- Description: Complete, idempotent single-file database schema definition
--              including extensions, enums, tables, relationships, indexes,
--              triggers, views, row-level security (RLS) policies, and default seeds.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 2. Custom Enumerations
-- ---------------------------------------------------------------------------

-- Registration channel (Online pre-registration vs. spot/desk registration)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_type') THEN
    CREATE TYPE public.registration_type AS ENUM ('ONLINE', 'OFFLINE');
  END IF;
END $$;

-- Payment status tracked at the check-in desk
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM (
      'not_paid',
      'partially_paid',
      'paid',
      'later_pay'
    );
  END IF;
END $$;

-- Payment payment method
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('CASH', 'UPI');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Utility Trigger Functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 4. Tables
-- ---------------------------------------------------------------------------

-- 4.1 Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT 'Orah – Campus Meet 2026',
  slug        text NOT NULL UNIQUE DEFAULT 'orah-2026',
  status      text NOT NULL DEFAULT 'ACCEPTING',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS events_slug_idx ON public.events (slug);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);

-- 4.2 Registrations Table (Participants)
CREATE TABLE IF NOT EXISTS public.registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_type public.registration_type NOT NULL DEFAULT 'ONLINE',
  name              text NOT NULL,
  dob               date NOT NULL,
  phone             text NOT NULL,
  email             text NOT NULL,
  gender            text NOT NULL,
  year_of_study     text,
  parish            text NOT NULL,
  diocese           text NOT NULL,
  college           text,
  address           text NOT NULL DEFAULT '',
  affiliation       text NOT NULL,
  institute         text,
  confirmed         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS registrations_updated_at ON public.registrations;
CREATE TRIGGER registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS registrations_event_id_idx ON public.registrations (event_id);
CREATE INDEX IF NOT EXISTS registrations_phone_idx ON public.registrations (phone);
CREATE INDEX IF NOT EXISTS registrations_email_idx ON public.registrations (email);
CREATE INDEX IF NOT EXISTS registrations_name_idx ON public.registrations (name);
CREATE INDEX IF NOT EXISTS registrations_created_at_idx ON public.registrations (created_at DESC);

-- 4.3 Tickets Table (Participant QR verification codes)
CREATE TABLE IF NOT EXISTS public.tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  token_hash      text NOT NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tickets_updated_at ON public.tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS tickets_id_idx ON public.tickets (id);
CREATE INDEX IF NOT EXISTS tickets_registration_id_idx ON public.tickets (registration_id);
CREATE INDEX IF NOT EXISTS tickets_token_hash_idx ON public.tickets (token_hash);

-- 4.4 Volunteer Registrations Table
CREATE TABLE IF NOT EXISTS public.volunteer_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name              text NOT NULL,
  phone             text NOT NULL,
  ministry          text NOT NULL,
  role              text NOT NULL DEFAULT 'Member',
  registration_type public.registration_type NOT NULL DEFAULT 'ONLINE',
  confirmed         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS volunteer_registrations_updated_at ON public.volunteer_registrations;
CREATE TRIGGER volunteer_registrations_updated_at
  BEFORE UPDATE ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS volunteer_registrations_event_id_idx ON public.volunteer_registrations (event_id);
CREATE INDEX IF NOT EXISTS volunteer_registrations_phone_idx ON public.volunteer_registrations (phone);
CREATE INDEX IF NOT EXISTS volunteer_registrations_name_idx ON public.volunteer_registrations (name);
CREATE INDEX IF NOT EXISTS volunteer_registrations_ministry_idx ON public.volunteer_registrations (ministry);
CREATE INDEX IF NOT EXISTS volunteer_registrations_created_at_idx ON public.volunteer_registrations (created_at DESC);

-- 4.5 Resource Registrations Table (Speakers / VIP Guests / Non-paying attendees)
CREATE TABLE IF NOT EXISTS public.resource_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name              text NOT NULL,
  phone             text,
  from_location     text,
  session           text,
  registration_type text NOT NULL DEFAULT 'SPOT',
  is_checked_in     boolean NOT NULL DEFAULT true,
  checked_in_at     timestamptz DEFAULT now(),
  checked_in_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS resource_registrations_updated_at ON public.resource_registrations;
CREATE TRIGGER resource_registrations_updated_at
  BEFORE UPDATE ON public.resource_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS resource_registrations_event_id_idx ON public.resource_registrations (event_id);
CREATE INDEX IF NOT EXISTS resource_registrations_name_idx ON public.resource_registrations (name);
CREATE INDEX IF NOT EXISTS resource_registrations_phone_idx ON public.resource_registrations (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS resource_registrations_session_idx ON public.resource_registrations (session) WHERE session IS NOT NULL;
CREATE INDEX IF NOT EXISTS resource_registrations_created_at_idx ON public.resource_registrations (created_at DESC);

-- 4.6 Checkins Table (Check-in verification, payments, round-robin participant groups)
CREATE TABLE IF NOT EXISTS public.checkins (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id             uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
  volunteer_registration_id   uuid REFERENCES public.volunteer_registrations(id) ON DELETE CASCADE,
  registration_option         text NOT NULL DEFAULT 'full',
  payment_status              public.payment_status NOT NULL DEFAULT 'not_paid',
  payment_method              public.payment_method,
  group_number                integer,
  amount_paid                 numeric(10,2) NOT NULL DEFAULT 0,
  amount_due                  numeric(10,2) NOT NULL DEFAULT 600,
  payment_note                text,
  checked_in_at               timestamptz,
  checked_in_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  -- Enforce: exactly one of registration_id or volunteer_registration_id is linked
  CONSTRAINT checkins_one_registration CHECK (
    (registration_id IS NOT NULL)::int + (volunteer_registration_id IS NOT NULL)::int = 1
  )
);

DROP TRIGGER IF EXISTS checkins_updated_at ON public.checkins;
CREATE TRIGGER checkins_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS checkins_registration_id_idx ON public.checkins (registration_id) WHERE registration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkins_volunteer_registration_id_idx ON public.checkins (volunteer_registration_id) WHERE volunteer_registration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkins_event_id_idx ON public.checkins (event_id);
CREATE INDEX IF NOT EXISTS checkins_payment_status_idx ON public.checkins (payment_status);
CREATE INDEX IF NOT EXISTS checkins_payment_method_idx ON public.checkins (payment_method) WHERE payment_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkins_group_number_idx ON public.checkins (group_number) WHERE group_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkins_checked_in_at_idx ON public.checkins (checked_in_at DESC);
CREATE INDEX IF NOT EXISTS checkins_created_at_idx ON public.checkins (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Views
-- ---------------------------------------------------------------------------

-- Unified view joining participant and volunteer check-in details
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
  vr.registration_type AS volunteer_registration_type,

  -- Resolved display fields (whichever is populated)
  COALESCE(r.name, vr.name)   AS display_name,
  COALESCE(r.phone, vr.phone) AS display_phone,
  CASE
    WHEN c.registration_id IS NOT NULL THEN 'participant'
    ELSE 'volunteer'
  END AS person_type

FROM public.checkins c
LEFT JOIN public.registrations r ON r.id = c.registration_id
LEFT JOIN public.volunteer_registrations vr ON vr.id = c.volunteer_registration_id;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security (RLS)
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- 6.1 Events Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Authenticated users can view events') THEN
    CREATE POLICY "Authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Authenticated users can manage events') THEN
    CREATE POLICY "Authenticated users can manage events" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6.2 Registrations Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Authenticated users can view registrations') THEN
    CREATE POLICY "Authenticated users can view registrations" ON public.registrations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Authenticated users can insert registrations') THEN
    CREATE POLICY "Authenticated users can insert registrations" ON public.registrations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Authenticated users can update registrations') THEN
    CREATE POLICY "Authenticated users can update registrations" ON public.registrations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6.3 Tickets Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Authenticated users can view tickets') THEN
    CREATE POLICY "Authenticated users can view tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Authenticated users can insert tickets') THEN
    CREATE POLICY "Authenticated users can insert tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Authenticated users can update tickets') THEN
    CREATE POLICY "Authenticated users can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6.4 Volunteer Registrations Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'volunteer_registrations' AND policyname = 'Authenticated users can select volunteer_registrations') THEN
    CREATE POLICY "Authenticated users can select volunteer_registrations" ON public.volunteer_registrations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'volunteer_registrations' AND policyname = 'Authenticated users can insert volunteer_registrations') THEN
    CREATE POLICY "Authenticated users can insert volunteer_registrations" ON public.volunteer_registrations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'volunteer_registrations' AND policyname = 'Authenticated users can update volunteer_registrations') THEN
    CREATE POLICY "Authenticated users can update volunteer_registrations" ON public.volunteer_registrations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6.5 Resource Registrations Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can select resource_registrations') THEN
    CREATE POLICY "Authenticated users can select resource_registrations" ON public.resource_registrations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can insert resource_registrations') THEN
    CREATE POLICY "Authenticated users can insert resource_registrations" ON public.resource_registrations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can update resource_registrations') THEN
    CREATE POLICY "Authenticated users can update resource_registrations" ON public.resource_registrations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_registrations' AND policyname = 'Authenticated users can delete resource_registrations') THEN
    CREATE POLICY "Authenticated users can delete resource_registrations" ON public.resource_registrations FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 6.6 Checkins Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'Authenticated users can view checkins') THEN
    CREATE POLICY "Authenticated users can view checkins" ON public.checkins FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'Authenticated users can insert checkins') THEN
    CREATE POLICY "Authenticated users can insert checkins" ON public.checkins FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'Authenticated users can update checkins') THEN
    CREATE POLICY "Authenticated users can update checkins" ON public.checkins FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'Authenticated users can delete checkins') THEN
    CREATE POLICY "Authenticated users can delete checkins" ON public.checkins FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Grant Permissions
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Seed Default Event
--    Matches FALLBACK_EVENT_ID used across front-desk check-in routes:
--    'b1145777-f2d2-41ea-b206-b4177f89f372'
-- ---------------------------------------------------------------------------
INSERT INTO public.events (id, name, slug, status)
VALUES (
  'b1145777-f2d2-41ea-b206-b4177f89f372',
  'Orah – Campus Meet 2026',
  'orah-2026',
  'ACCEPTING'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status;

-- =============================================================================
-- END OF UNIFIED SCHEMA
-- =============================================================================
