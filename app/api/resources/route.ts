import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateResourceForm,
  sanitizeInput,
  type ResourceFormData,
  type ResourceRegistration,
} from "@/components/resources/resource-registration-types";

const FALLBACK_EVENT_ID = "b1145777-f2d2-41ea-b206-b4177f89f372";

// GET /api/resources - List all resource registrations
export async function GET() {
  try {
    const supabase = await createClient();

    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    const { data, error } = await dbClient
      .from("resource_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("API notice fetching resource_registrations:", error.message);
      // Table may not exist yet if SQL migration is pending manual run
      return NextResponse.json(
        { resources: [], pendingMigration: true, error: error.message },
        { status: 200 }
      );
    }

    const resources: ResourceRegistration[] = (data ?? []).map((row) => ({
      id: row.id,
      event_id: row.event_id,
      name: row.name,
      phone: row.phone || null,
      from_location: row.from_location || null,
      session: row.session || null,
      registration_type: row.registration_type || "SPOT",
      is_checked_in: !!row.is_checked_in,
      checked_in_at: row.checked_in_at || null,
      checked_in_by: row.checked_in_by || null,
      notes: row.notes || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ resources });
  } catch (err: any) {
    console.error("API error in /api/resources GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/resources - Register a new resource person (always on-spot, NO fee collection)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to register resource persons." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const formData: ResourceFormData = body.formData;

    if (!formData) {
      return NextResponse.json(
        { error: "Missing form data." },
        { status: 400 }
      );
    }

    // 2. Validate form
    const validationErrors = validateResourceForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", validationErrors },
        { status: 400 }
      );
    }

    // 3. Database client
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

    // 5. Build payload: Resource registrations are always SPOT with NO fee collection
    const isCheckedIn = formData.isCheckedIn !== false;
    const resourcePayload = {
      event_id: eventId,
      name: sanitizeInput(formData.name.trim()),
      phone: formData.phone?.trim() ? sanitizeInput(formData.phone.trim()) : null,
      from_location: formData.fromLocation?.trim()
        ? sanitizeInput(formData.fromLocation.trim())
        : null,
      session: formData.session?.trim() ? sanitizeInput(formData.session.trim()) : null,
      registration_type: "SPOT",
      is_checked_in: isCheckedIn,
      checked_in_at: isCheckedIn ? new Date().toISOString() : null,
      checked_in_by: user.id,
      notes: formData.notes?.trim() ? sanitizeInput(formData.notes.trim()) : null,
    };

    const { data: resource, error: insertError } = await dbClient
      .from("resource_registrations")
      .insert(resourcePayload)
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating resource registration:", insertError);
      return NextResponse.json(
        {
          error:
            insertError.message.includes("relation") &&
            insertError.message.includes("does not exist")
              ? "The resource_registrations table does not exist yet. Please run migration 005_resource_registrations.sql in Supabase SQL editor."
              : insertError.message || "Failed to create resource registration.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Resource person registered successfully with no fee collection.",
      resource: {
        id: resource.id,
        event_id: resource.event_id,
        name: resource.name,
        phone: resource.phone,
        from_location: resource.from_location,
        session: resource.session,
        registration_type: resource.registration_type,
        is_checked_in: resource.is_checked_in,
        checked_in_at: resource.checked_in_at,
        created_at: resource.created_at,
      },
    });
  } catch (err: any) {
    console.error("API error in /api/resources POST:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

// PATCH /api/resources - Toggle check-in status or update resource
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { id, is_checked_in } = body;

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required." }, { status: 400 });
    }

    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof is_checked_in === "boolean") {
      updatePayload.is_checked_in = is_checked_in;
      updatePayload.checked_in_at = is_checked_in ? new Date().toISOString() : null;
      updatePayload.checked_in_by = is_checked_in ? user.id : null;
    }

    const { data: updated, error: updateErr } = await dbClient
      .from("resource_registrations")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resource: updated,
    });
  } catch (err: any) {
    console.error("API error in /api/resources PATCH:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/resources - Delete resource registration
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required." }, { status: 400 });
    }

    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    const { error: delErr } = await dbClient
      .from("resource_registrations")
      .delete()
      .eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Resource registration deleted successfully.",
    });
  } catch (err: any) {
    console.error("API error in /api/resources DELETE:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

