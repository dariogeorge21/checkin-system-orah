import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UnifiedAttendee } from "@/components/checkin/checkin-types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const filter = searchParams.get("filter") || "all"; // 'all' | 'participants' | 'volunteers' | 'pending' | 'verified'
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    const cleanQuery = query.toLowerCase();
    const phoneQuery = query.replace(/\D/g, ""); // digits only

    // 2. Fetch Participants (if applicable)
    let participants: any[] = [];
    if (filter !== "volunteers") {
      let pQuery = dbClient
        .from("registrations")
        .select(
          "id, name, phone, email, gender, dob, parish, diocese, affiliation, college, institute, year_of_study, address, registration_type, created_at, checkins(id, payment_status, payment_method, amount_paid, amount_due, payment_note, checked_in_at, checked_in_by)"
        )
        .order("created_at", { ascending: false });

      if (cleanQuery) {
        // If searching with digits, filter on phone or other fields
        if (phoneQuery.length >= 3) {
          pQuery = pQuery.or(
            `name.ilike.%${cleanQuery}%,phone.ilike.%${phoneQuery}%,email.ilike.%${cleanQuery}%,parish.ilike.%${cleanQuery}%,diocese.ilike.%${cleanQuery}%`
          );
        } else {
          pQuery = pQuery.or(
            `name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,parish.ilike.%${cleanQuery}%,diocese.ilike.%${cleanQuery}%`
          );
        }
      }

      const { data, error: pErr } = await pQuery.limit(limit);
      if (!pErr && data) {
        participants = data;
      }
    }

    // 3. Fetch Volunteers (if applicable)
    let volunteers: any[] = [];
    if (filter !== "participants") {
      let vQuery = dbClient
        .from("volunteer_registrations")
        .select(
          "id, name, phone, ministry, role, registration_type, created_at, checkins(id, payment_status, payment_method, amount_paid, amount_due, payment_note, checked_in_at, checked_in_by)"
        )
        .order("created_at", { ascending: false });

      if (cleanQuery) {
        if (phoneQuery.length >= 3) {
          vQuery = vQuery.or(
            `name.ilike.%${cleanQuery}%,phone.ilike.%${phoneQuery}%,ministry.ilike.%${cleanQuery}%,role.ilike.%${cleanQuery}%`
          );
        } else {
          vQuery = vQuery.or(
            `name.ilike.%${cleanQuery}%,ministry.ilike.%${cleanQuery}%,role.ilike.%${cleanQuery}%`
          );
        }
      }

      const { data, error: vErr } = await vQuery.limit(limit);
      if (!vErr && data) {
        volunteers = data;
      }
    }

    // 4. Transform into unified attendee format
    const unifiedResults: UnifiedAttendee[] = [];

    // Map participants
    for (const p of participants) {
      const checkinArr = Array.isArray(p.checkins) ? p.checkins : p.checkins ? [p.checkins] : [];
      const primaryCheckin = checkinArr[0] || null;
      const isCheckedIn = !!primaryCheckin;

      // Apply status filter
      if (filter === "pending" && isCheckedIn) continue;
      if (filter === "verified" && !isCheckedIn) continue;

      unifiedResults.push({
        id: p.id,
        personType: "participant",
        name: p.name,
        phone: p.phone,
        email: p.email,
        parish: p.parish,
        diocese: p.diocese,
        affiliation: p.affiliation,
        college: p.college,
        institute: p.institute,
        year_of_study: p.year_of_study,
        address: p.address,
        registrationType: p.registration_type,
        createdAt: p.created_at,
        isCheckedIn,
        checkin: primaryCheckin
          ? {
              id: primaryCheckin.id,
              payment_status: primaryCheckin.payment_status || "not_paid",
              payment_method: primaryCheckin.payment_method || null,
              amount_paid: Number(primaryCheckin.amount_paid) || 0,
              amount_due: Number(primaryCheckin.amount_due) || 0,
              payment_note: primaryCheckin.payment_note || null,
              checked_in_at: primaryCheckin.checked_in_at,
              checked_in_by: primaryCheckin.checked_in_by,
            }
          : null,
      });
    }

    // Map volunteers
    for (const v of volunteers) {
      const checkinArr = Array.isArray(v.checkins) ? v.checkins : v.checkins ? [v.checkins] : [];
      const primaryCheckin = checkinArr[0] || null;
      const isCheckedIn = !!primaryCheckin;

      // Apply status filter
      if (filter === "pending" && isCheckedIn) continue;
      if (filter === "verified" && !isCheckedIn) continue;

      unifiedResults.push({
        id: v.id,
        personType: "volunteer",
        name: v.name,
        phone: v.phone,
        ministry: v.ministry,
        role: v.role,
        registrationType: v.registration_type || "OFFLINE",
        createdAt: v.created_at,
        isCheckedIn,
        checkin: primaryCheckin
          ? {
              id: primaryCheckin.id,
              payment_status: primaryCheckin.payment_status || "not_paid",
              payment_method: primaryCheckin.payment_method || null,
              amount_paid: Number(primaryCheckin.amount_paid) || 0,
              amount_due: Number(primaryCheckin.amount_due) || 0,
              payment_note: primaryCheckin.payment_note || null,
              checked_in_at: primaryCheckin.checked_in_at,
              checked_in_by: primaryCheckin.checked_in_by,
            }
          : null,
      });
    }

    // Sort: Pending first when query exists (front-desk priority), then by created_at
    if (cleanQuery) {
      unifiedResults.sort((a, b) => {
        // Exact phone match gets top priority
        const aExactPhone = phoneQuery && a.phone.replace(/\D/g, "").includes(phoneQuery);
        const bExactPhone = phoneQuery && b.phone.replace(/\D/g, "").includes(phoneQuery);
        if (aExactPhone && !bExactPhone) return -1;
        if (!aExactPhone && bExactPhone) return 1;

        // Pending first
        if (!a.isCheckedIn && b.isCheckedIn) return -1;
        if (a.isCheckedIn && !b.isCheckedIn) return 1;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return NextResponse.json({
      results: unifiedResults.slice(0, limit),
      totalCount: unifiedResults.length,
      query: cleanQuery,
    });
  } catch (err: any) {
    console.error("API error in /api/checkin/search:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
