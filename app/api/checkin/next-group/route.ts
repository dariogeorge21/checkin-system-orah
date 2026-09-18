import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    const { searchParams } = new URL(req.url);
    const registrationId = searchParams.get("registrationId");

    // If registrationId is provided, check if attendee already has an assigned group
    if (registrationId) {
      try {
        const { data: existingCheckin } = await dbClient
          .from("checkins")
          .select("group_number")
          .eq("registration_id", registrationId)
          .maybeSingle();

        if (existingCheckin?.group_number) {
          return NextResponse.json({
            groupNumber: existingCheckin.group_number,
            isAssigned: true,
          });
        }
      } catch (err) {
        // Continue to sequential calculation if column is pending migration
        console.warn("Could not query existing group_number:", err);
      }
    }

    // Count existing participant check-ins to compute next group in 1-15 round-robin order
    const { count, error: countErr } = await dbClient
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .not("registration_id", "is", null);

    if (countErr) {
      console.warn("Error counting participant checkins:", countErr.message);
    }

    const totalParticipants = count ?? 0;
    // Check-in 1 -> Group 1, Check-in 15 -> Group 15, Check-in 16 -> Group 1
    const nextGroup = (totalParticipants % 15) + 1;

    return NextResponse.json({
      groupNumber: nextGroup,
      isAssigned: false,
      totalCheckedInParticipants: totalParticipants,
    });
  } catch (err: any) {
    console.error("Error in /api/checkin/next-group:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
