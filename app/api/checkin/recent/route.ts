import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecentCheckinItem } from "@/components/checkin/checkin-types";

export async function GET() {
  try {
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

    // 2. Fetch recent checkins
    // Try view checkin_details first
    let recentData: any[] = [];
    const { data: viewData, error: viewErr } = await dbClient
      .from("checkin_details")
      .select("*")
      .order("checked_in_at", { ascending: false })
      .limit(15);

    if (!viewErr && viewData && viewData.length > 0) {
      recentData = viewData;
    } else {
      // Fallback direct table query
      const { data: tableData, error: tableErr } = await dbClient
        .from("checkins")
        .select(`
          id,
          registration_id,
          volunteer_registration_id,
          payment_status,
          payment_method,
          amount_paid,
          amount_due,
          checked_in_at,
          registrations ( id, name, phone, parish, registration_type ),
          volunteer_registrations ( id, name, phone, ministry, registration_type )
        `)
        .order("checked_in_at", { ascending: false })
        .limit(15);

      if (!tableErr && tableData) {
        recentData = tableData.map((row: any) => {
          const isParticipant = !!row.registration_id;
          const reg = row.registrations;
          const vol = row.volunteer_registrations;
          return {
            id: row.id,
            registration_id: row.registration_id,
            volunteer_registration_id: row.volunteer_registration_id,
            person_type: isParticipant ? "participant" : "volunteer",
            display_name: isParticipant ? reg?.name : vol?.name,
            display_phone: isParticipant ? reg?.phone : vol?.phone,
            participant_parish: reg?.parish,
            volunteer_ministry: vol?.ministry,
            participant_registration_type: reg?.registration_type,
            volunteer_registration_type: vol?.registration_type,
            payment_status: row.payment_status,
            payment_method: row.payment_method,
            amount_paid: row.amount_paid,
            amount_due: row.amount_due,
            checked_in_at: row.checked_in_at,
          };
        });
      }
    }

    const items: RecentCheckinItem[] = (recentData ?? []).map((row) => ({
      id: row.id,
      personType: row.person_type === "volunteer" ? "volunteer" : "participant",
      registrationId: row.registration_id || row.volunteer_registration_id || "",
      name: row.display_name || row.participant_name || row.volunteer_name || "Unknown",
      phone: row.display_phone || row.participant_phone || row.volunteer_phone || "",
      parishOrMinistry:
        row.person_type === "volunteer"
          ? row.volunteer_ministry || "Volunteer"
          : row.participant_parish || "Participant",
      paymentStatus: row.payment_status || "not_paid",
      paymentMethod: row.payment_method || null,
      amountPaid: Number(row.amount_paid) || 0,
      amountDue: Number(row.amount_due) || 0,
      checkedInAt: row.checked_in_at || new Date().toISOString(),
      registrationType:
        row.participant_registration_type || row.volunteer_registration_type || "ONLINE",
    }));

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("API error in /api/checkin/recent:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
