import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UnifiedAttendee } from "@/components/checkin/checkin-types";

// Helper to extract a UUID or ticket ID from raw text, JSON, or URL
function parseQrCode(input: string): string {
  const trimmed = input.trim();

  // 1. Try parsing JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.ticket_id) return String(parsed.ticket_id).trim();
      if (parsed.ticketId) return String(parsed.ticketId).trim();
      if (parsed.id) return String(parsed.id).trim();
      if (parsed.registration_id) return String(parsed.registration_id).trim();
    } catch {
      // Not valid JSON, continue
    }
  }

  // 2. Try parsing URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const ticketIdParam =
        url.searchParams.get("ticket_id") ||
        url.searchParams.get("ticketId") ||
        url.searchParams.get("id") ||
        url.searchParams.get("tid");
      if (ticketIdParam) return ticketIdParam.trim();

      // Extract last path segment
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        return lastSegment.trim();
      }
    } catch {
      // Not valid URL, continue
    }
  }

  // 3. Raw string / UUID
  return trimmed;
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
        { error: "Unauthorized. Please sign in to scan tickets." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const rawQr = body.qrCode || body.ticketId || body.code || "";

    if (!rawQr || typeof rawQr !== "string" || !rawQr.trim()) {
      return NextResponse.json(
        { error: "No QR code or ticket ID provided." },
        { status: 400 }
      );
    }

    const cleanId = parseQrCode(rawQr);

    // 2. Get DB Client
    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    // 3. Query tickets table
    let ticketRecord: any = null;
    let registrationId: string | null = null;

    // Check by ticket primary key ID
    const { data: ticketById } = await dbClient
      .from("tickets")
      .select("id, registration_id, token_hash, issued_at, created_at")
      .eq("id", cleanId)
      .maybeSingle();

    if (ticketById) {
      ticketRecord = ticketById;
      registrationId = ticketById.registration_id;
    } else {
      // Fallback: check by token_hash or registration_id in tickets
      const { data: ticketByTokenOrReg } = await dbClient
        .from("tickets")
        .select("id, registration_id, token_hash, issued_at, created_at")
        .or(`token_hash.eq.${cleanId},registration_id.eq.${cleanId}`)
        .maybeSingle();

      if (ticketByTokenOrReg) {
        ticketRecord = ticketByTokenOrReg;
        registrationId = ticketByTokenOrReg.registration_id;
      }
    }

    // If ticket record not found, check if cleanId is a direct participant registration ID
    if (!registrationId) {
      const { data: directReg } = await dbClient
        .from("registrations")
        .select("id")
        .eq("id", cleanId)
        .maybeSingle();

      if (directReg) {
        registrationId = directReg.id;
      }
    }

    // If still not found, check if it was a volunteer registration ID (to give clear user feedback)
    if (!registrationId) {
      const { data: volunteerReg } = await dbClient
        .from("volunteer_registrations")
        .select("id, name")
        .eq("id", cleanId)
        .maybeSingle();

      if (volunteerReg) {
        return NextResponse.json(
          {
            error: `This ticket belongs to a Volunteer (${volunteerReg.name}). Ticket QR scanner check-in is strictly for Participants. Please check in volunteers via the Volunteers tab.`,
            isVolunteer: true,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: `Ticket not found. No participant record linked to Ticket ID "${cleanId}".`,
          scannedId: cleanId,
        },
        { status: 404 }
      );
    }

    // 4. Fetch full participant details
    const { data: participant, error: pErr } = await dbClient
      .from("registrations")
      .select(
        "id, name, phone, email, gender, dob, parish, diocese, affiliation, college, institute, year_of_study, address, registration_type, confirmed, created_at"
      )
      .eq("id", registrationId)
      .single();

    if (pErr || !participant) {
      return NextResponse.json(
        { error: "Participant details could not be found for this ticket." },
        { status: 404 }
      );
    }

    // 5. Fetch check-in status
    const { data: checkinData } = await dbClient
      .from("checkins")
      .select(
        "id, payment_status, payment_method, amount_paid, amount_due, payment_note, checked_in_at, checked_in_by"
      )
      .eq("registration_id", participant.id)
      .maybeSingle();

    const isCheckedIn = !!checkinData;

    const unifiedParticipant: UnifiedAttendee = {
      id: participant.id,
      personType: "participant",
      name: participant.name,
      phone: participant.phone,
      email: participant.email,
      gender: participant.gender,
      dob: participant.dob,
      parish: participant.parish,
      diocese: participant.diocese,
      affiliation: participant.affiliation,
      college: participant.college,
      institute: participant.institute,
      year_of_study: participant.year_of_study,
      address: participant.address,
      registrationType: participant.registration_type,
      createdAt: participant.created_at,
      isCheckedIn,
      checkin: checkinData
        ? {
            id: checkinData.id,
            payment_status: checkinData.payment_status || "not_paid",
            payment_method: checkinData.payment_method || null,
            amount_paid: Number(checkinData.amount_paid) || 0,
            amount_due: Number(checkinData.amount_due) || 0,
            payment_note: checkinData.payment_note || null,
            checked_in_at: checkinData.checked_in_at,
            checked_in_by: checkinData.checked_in_by,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      scannedId: cleanId,
      ticket: ticketRecord
        ? {
            id: ticketRecord.id,
            registration_id: ticketRecord.registration_id,
            token_hash: ticketRecord.token_hash,
            issued_at: ticketRecord.issued_at,
          }
        : {
            id: cleanId,
            registration_id: participant.id,
            token_hash: null,
            issued_at: null,
          },
      participant: unifiedParticipant,
      isAlreadyCheckedIn: isCheckedIn,
    });
  } catch (err: any) {
    console.error("API error in /api/tickets/scan:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while scanning ticket." },
      { status: 500 }
    );
  }
}
