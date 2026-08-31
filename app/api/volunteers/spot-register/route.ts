import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateVolunteerSpotForm,
  sanitizeInput,
  type VolunteerSpotFormData,
  type VolunteerSpotPaymentData,
} from "@/components/volunteers/volunteer-spot-registration-types";

const FALLBACK_EVENT_ID = "b1145777-f2d2-41ea-b206-b4177f89f372";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to register volunteers." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const formData: VolunteerSpotFormData = body.formData;
    const paymentData: VolunteerSpotPaymentData = body.paymentData;

    if (!formData || !paymentData) {
      return NextResponse.json(
        { error: "Missing form data or payment data." },
        { status: 400 }
      );
    }

    // 2. Validate form data
    const validationErrors = validateVolunteerSpotForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", validationErrors },
        { status: 400 }
      );
    }

    // 3. Prepare DB client (admin client provides unhindered desk operations)
    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    // 4. Resolve active event ID
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

    // 5. Format ministry value
    const finalMinistry =
      formData.ministry === "Other"
        ? sanitizeInput(formData.ministryOther.trim())
        : formData.ministry;

    // 6. Insert into volunteer_registrations
    const newVolunteerPayload = {
      event_id: eventId,
      name: sanitizeInput(formData.name.trim()),
      phone: sanitizeInput(formData.phone.trim()),
      ministry: finalMinistry,
      role: formData.role,
      registration_type: "OFFLINE",
      confirmed: true,
    };

    const { data: volunteer, error: volError } = await dbClient
      .from("volunteer_registrations")
      .insert(newVolunteerPayload)
      .select("*")
      .single();

    if (volError || !volunteer) {
      console.error("Error creating volunteer spot registration:", volError);
      return NextResponse.json(
        { error: volError?.message || "Failed to create volunteer registration record." },
        { status: 500 }
      );
    }

    // 7. Auto-approve and insert into checkins table
    const checkinPayload: Record<string, any> = {
      event_id: eventId,
      volunteer_registration_id: volunteer.id,
      registration_option: "full",
      payment_status: paymentData.status,
      payment_method: paymentData.method,
      amount_paid: Number(paymentData.amountPaid) || 0,
      amount_due: Number(paymentData.amountDue) || 0,
      payment_note: paymentData.note ? sanitizeInput(paymentData.note.trim()) : null,
      checked_in_at: new Date().toISOString(),
      checked_in_by: user.id,
    };

    let checkinResult: any = null;
    const { data: checkin, error: checkinError } = await dbClient
      .from("checkins")
      .insert(checkinPayload)
      .select("*")
      .single();

    if (checkinError) {
      // Fallback if payment_method column is pending migration
      if (
        checkinError.message.includes("payment_method") ||
        checkinError.message.includes("column")
      ) {
        console.warn(
          "Checkin insert failed with payment_method. Retrying without payment_method column..."
        );
        const fallbackCheckinPayload = { ...checkinPayload };
        delete fallbackCheckinPayload.payment_method;
        fallbackCheckinPayload.payment_note = fallbackCheckinPayload.payment_note
          ? `[Method: ${paymentData.method}] ${fallbackCheckinPayload.payment_note}`
          : `[Method: ${paymentData.method}]`;

        const { data: retryCheckin, error: retryError } = await dbClient
          .from("checkins")
          .insert(fallbackCheckinPayload)
          .select("*")
          .single();

        if (retryError) {
          console.error("Error in fallback checkin insertion:", retryError);
          return NextResponse.json(
            { error: "Volunteer created, but check-in record failed: " + retryError.message },
            { status: 500 }
          );
        }
        checkinResult = retryCheckin;
      } else {
        console.error("Error creating volunteer checkin record:", checkinError);
        return NextResponse.json(
          { error: "Volunteer created, but check-in record failed: " + checkinError.message },
          { status: 500 }
        );
      }
    } else {
      checkinResult = checkin;
    }

    return NextResponse.json({
      success: true,
      message: "Volunteer registered, auto-approved, and checked in successfully.",
      volunteer: {
        id: volunteer.id,
        name: volunteer.name,
        phone: volunteer.phone,
        ministry: volunteer.ministry,
        role: volunteer.role,
        registration_type: volunteer.registration_type,
        created_at: volunteer.created_at,
        is_verified: true,
      },
      checkin: checkinResult,
    });
  } catch (err: any) {
    console.error("API error in /api/volunteers/spot-register:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
