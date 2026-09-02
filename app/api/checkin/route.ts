import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CheckinPaymentData, PersonType } from "@/components/checkin/checkin-types";

const FALLBACK_EVENT_ID = "b1145777-f2d2-41ea-b206-b4177f89f372";

function sanitize(val?: string | null): string | null {
  if (!val) return null;
  return val.replace(/<[^>]*>/g, "").trim();
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to check in attendees." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const personType: PersonType = body.personType;
    const registrationId: string = body.registrationId;
    const paymentData: CheckinPaymentData = body.paymentData;
    const registrationOption: string = body.registrationOption || "full";

    if (!personType || !registrationId || !paymentData) {
      return NextResponse.json(
        { error: "Missing required fields: personType, registrationId, or paymentData." },
        { status: 400 }
      );
    }

    // 2. Prepare DB Client (admin client bypasses RLS roadblocks)
    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    // 3. Resolve active event ID
    let eventId = FALLBACK_EVENT_ID;
    const { data: eventData } = await dbClient
      .from("events")
      .select("id")
      .or("status.eq.ACCEPTING,slug.eq.orah-2026")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventData?.id) {
      eventId = eventData.id;
    }

    // 4. Verify person exists and fetch details
    let personRecord: any = null;
    if (personType === "participant") {
      const { data: participant, error: pErr } = await dbClient
        .from("registrations")
        .select("id, name, phone, email, parish, diocese, confirmed")
        .eq("id", registrationId)
        .single();

      if (pErr || !participant) {
        return NextResponse.json(
          { error: "Participant registration not found." },
          { status: 404 }
        );
      }
      personRecord = participant;

      // Ensure confirmed is true
      if (!participant.confirmed) {
        await dbClient
          .from("registrations")
          .update({ confirmed: true, updated_at: new Date().toISOString() })
          .eq("id", registrationId);
      }
    } else {
      const { data: volunteer, error: vErr } = await dbClient
        .from("volunteer_registrations")
        .select("id, name, phone, ministry, role, confirmed")
        .eq("id", registrationId)
        .single();

      if (vErr || !volunteer) {
        return NextResponse.json(
          { error: "Volunteer registration not found." },
          { status: 404 }
        );
      }
      personRecord = volunteer;

      // Ensure confirmed is true
      if (!volunteer.confirmed) {
        await dbClient
          .from("volunteer_registrations")
          .update({ confirmed: true, updated_at: new Date().toISOString() })
          .eq("id", registrationId);
      }
    }

    // 5. Check if checkin already exists
    const queryField = personType === "participant" ? "registration_id" : "volunteer_registration_id";
    const { data: existingCheckin } = await dbClient
      .from("checkins")
      .select("id")
      .eq(queryField, registrationId)
      .maybeSingle();

    const checkinPayload: Record<string, any> = {
      event_id: eventId,
      [queryField]: registrationId,
      registration_option: registrationOption,
      payment_status: paymentData.status,
      payment_method: paymentData.method,
      amount_paid: Number(paymentData.amountPaid) || 0,
      amount_due: Number(paymentData.amountDue) || 0,
      payment_note: sanitize(paymentData.note),
      checked_in_at: new Date().toISOString(),
      checked_in_by: user.id,
      updated_at: new Date().toISOString(),
    };

    let checkinResult: any = null;

    if (existingCheckin?.id) {
      // Update existing checkin
      const { data: updated, error: updateErr } = await dbClient
        .from("checkins")
        .update(checkinPayload)
        .eq("id", existingCheckin.id)
        .select("*")
        .single();

      if (updateErr) {
        // Retry without payment_method column if schema error
        if (updateErr.message.includes("payment_method") || updateErr.message.includes("column")) {
          const fallbackPayload = { ...checkinPayload };
          delete fallbackPayload.payment_method;
          fallbackPayload.payment_note = fallbackPayload.payment_note
            ? `[Method: ${paymentData.method}] ${fallbackPayload.payment_note}`
            : `[Method: ${paymentData.method}]`;

          const { data: fallbackUpdated, error: fallbackErr } = await dbClient
            .from("checkins")
            .update(fallbackPayload)
            .eq("id", existingCheckin.id)
            .select("*")
            .single();

          if (fallbackErr) {
            return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
          }
          checkinResult = fallbackUpdated;
        } else {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }
      } else {
        checkinResult = updated;
      }
    } else {
      // Insert new checkin
      const { data: inserted, error: insertErr } = await dbClient
        .from("checkins")
        .insert(checkinPayload)
        .select("*")
        .single();

      if (insertErr) {
        // Retry without payment_method column if schema error
        if (insertErr.message.includes("payment_method") || insertErr.message.includes("column")) {
          const fallbackPayload = { ...checkinPayload };
          delete fallbackPayload.payment_method;
          fallbackPayload.payment_note = fallbackPayload.payment_note
            ? `[Method: ${paymentData.method}] ${fallbackPayload.payment_note}`
            : `[Method: ${paymentData.method}]`;

          const { data: fallbackInserted, error: fallbackErr } = await dbClient
            .from("checkins")
            .insert(fallbackPayload)
            .select("*")
            .single();

          if (fallbackErr) {
            return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
          }
          checkinResult = fallbackInserted;
        } else {
          return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
      } else {
        checkinResult = inserted;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${personType === "participant" ? "Participant" : "Volunteer"} checked in successfully.`,
      person: personRecord,
      checkin: checkinResult,
    });
  } catch (err: any) {
    console.error("API error in /api/checkin POST:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const checkinId = searchParams.get("id");

    if (!checkinId) {
      return NextResponse.json({ error: "Check-in ID required." }, { status: 400 });
    }

    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    const { error: delErr } = await dbClient
      .from("checkins")
      .delete()
      .eq("id", checkinId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Check-in reverted successfully." });
  } catch (err: any) {
    console.error("API error in /api/checkin DELETE:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
