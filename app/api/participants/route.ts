import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Participant } from "@/components/participants/participants-table";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id, name, phone, email, gender, dob, parish, diocese, affiliation, college, institute, year_of_study, address, registration_type, created_at, checkins(id, payment_status, payment_method, amount_paid, amount_due, payment_note, checked_in_at)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API error fetching participants:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const participants: Participant[] = (data ?? []).map((row) => {
      const checkinList = Array.isArray(row.checkins) ? row.checkins : row.checkins ? [row.checkins] : [];
      const chk = checkinList[0] || null;
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        gender: row.gender,
        dob: row.dob,
        parish: row.parish,
        diocese: row.diocese,
        affiliation: row.affiliation,
        college: row.college,
        institute: row.institute,
        year_of_study: row.year_of_study,
        address: row.address,
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

    return NextResponse.json({ participants });
  } catch (err) {
    console.error("API error in /api/participants:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
