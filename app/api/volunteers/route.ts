import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { VolunteerRegistration } from "@/components/volunteers/volunteers-table";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("volunteer_registrations")
      .select(
        "id, name, phone, ministry, role, registration_type, created_at, checkins(id, payment_status, payment_method, amount_paid, amount_due, payment_note, checked_in_at)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API error fetching volunteers:", error.message);
      // Table may not exist yet if pre-migration
      return NextResponse.json({ volunteers: [], error: error.message }, { status: 200 });
    }

    const volunteers: VolunteerRegistration[] = (data ?? []).map((row) => {
      const checkinList = Array.isArray(row.checkins) ? row.checkins : row.checkins ? [row.checkins] : [];
      const chk = checkinList[0] || null;
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        ministry: row.ministry,
        role: row.role,
        registration_type: row.registration_type,
        created_at: row.created_at,
        is_verified: !!chk,
        checkin: chk
          ? {
              id: chk.id,
              payment_status: chk.payment_status,
              payment_method: chk.payment_method,
              amount_paid: Number(chk.amount_paid) || 0,
              amount_due: Number(chk.amount_due) || 0,
              payment_note: chk.payment_note,
              checked_in_at: chk.checked_in_at,
            }
          : null,
      };
    });

    return NextResponse.json({ volunteers });
  } catch (err) {
    console.error("API error in /api/volunteers:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
