import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateSpotRegistrationForm,
  sanitizeInput,
  type SpotRegistrationFormData,
  type SpotPaymentData,
} from "@/components/participants/spot-registration-types";

const FALLBACK_EVENT_ID = "b1145777-f2d2-41ea-b206-b4177f89f372";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to register participants." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const formData: SpotRegistrationFormData = body.formData;
    const paymentData: SpotPaymentData = body.paymentData;

    if (!formData || !paymentData) {
      return NextResponse.json(
        { error: "Missing form data or payment data." },
        { status: 400 }
      );
    }

    // Validate form data
    const validationErrors = validateSpotRegistrationForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", validationErrors },
        { status: 400 }
      );
    }

    // Prepare db client (admin client provides unhindered desk operations)
    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      // Fallback to authenticated server client if service key is missing
      dbClient = supabase;
    }

    // Resolve active event ID
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

    // Format conditional fields
    const finalAffiliation =
      formData.affiliation === "Other"
        ? sanitizeInput(formData.affiliationOther.trim())
        : formData.affiliation;

    let finalCollege: string | null = null;
    let finalYearOfStudy: string | null = null;
    let finalInstitute: string | null = null;

    if (formData.affiliation === "College") {
      finalCollege =
        formData.college === "Other"
          ? sanitizeInput(formData.collegeOther.trim())
          : formData.college;

      finalYearOfStudy =
        formData.yearOfStudy === "Other"
          ? sanitizeInput(formData.yearOfStudyOther.trim())
          : formData.yearOfStudy;
    } else if (formData.affiliation === "Institutes") {
      finalInstitute =
        formData.institute === "Other"
          ? sanitizeInput(formData.instituteOther.trim())
          : formData.institute;
    }

    // 1. Insert into registrations
    const newRegistrationPayload = {
      event_id: eventId,
      registration_type: "SPOT",
      name: sanitizeInput(formData.name.trim()),
      dob: formData.dob,
      phone: sanitizeInput(formData.phone.trim()),
      email: sanitizeInput(formData.email.trim().toLowerCase()),
      gender: formData.gender,
      affiliation: finalAffiliation,
      college: finalCollege,
      institute: finalInstitute,
      year_of_study: finalYearOfStudy,
      parish: sanitizeInput(formData.parish.trim()),
      diocese: sanitizeInput(formData.diocese.trim()),
      address: sanitizeInput(formData.address.trim()),
      confirmed: true,
    };

    const { data: registration, error: regError } = await dbClient
      .from("registrations")
      .insert(newRegistrationPayload)
      .select("*")
      .single();

    if (regError || !registration) {
      console.error("Error creating spot registration:", regError);
      return NextResponse.json(
        { error: regError?.message || "Failed to create registration record." },
        { status: 500 }
      );
    }

    // 2. Auto-approve and insert into checkins table
    const checkinPayload: Record<string, any> = {
      event_id: eventId,
      registration_id: registration.id,
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
      // Check if failure is due to missing payment_method column (pre-migration)
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
            { error: "Registration created, but check-in record failed: " + retryError.message },
            { status: 500 }
          );
        }
        checkinResult = retryCheckin;
      } else {
        console.error("Error creating checkin record:", checkinError);
        return NextResponse.json(
          { error: "Registration created, but check-in record failed: " + checkinError.message },
          { status: 500 }
        );
      }
    } else {
      checkinResult = checkin;
    }

    return NextResponse.json({
      success: true,
      message: "Participant registered, auto-approved, and checked in successfully.",
      participant: {
        id: registration.id,
        name: registration.name,
        phone: registration.phone,
        email: registration.email,
        gender: registration.gender,
        dob: registration.dob,
        parish: registration.parish,
        diocese: registration.diocese,
        affiliation: registration.affiliation,
        college: registration.college,
        institute: registration.institute,
        year_of_study: registration.year_of_study,
        address: registration.address,
        registration_type: registration.registration_type,
        created_at: registration.created_at,
        is_verified: true,
      },
      checkin: checkinResult,
    });
  } catch (err: any) {
    console.error("API error in /api/participants/spot-register:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
