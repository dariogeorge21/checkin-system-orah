import { createClient } from "@/lib/supabase/server";
import { VolunteersTable } from "@/components/volunteers/volunteers-table";
import type { VolunteerRegistration } from "@/components/volunteers/volunteers-table";

export const metadata = {
  title: "Volunteers | Orah",
};

async function getVolunteers(): Promise<VolunteerRegistration[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("volunteer_registrations")
    .select("id, name, phone, ministry, role, registration_type, created_at, checkins(id)")
    .order("created_at", { ascending: false });

  if (error) {
    // Table may not exist yet (pre-migration) — return empty gracefully
    console.error("Failed to fetch volunteers:", error.message);
    return [];
  }

  return (
    data?.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      ministry: row.ministry,
      role: row.role,
      registration_type: row.registration_type,
      created_at: row.created_at,
      is_verified: Array.isArray(row.checkins) && row.checkins.length > 0,
    })) ?? []
  );
}

export default async function VolunteersPage() {
  const volunteers = await getVolunteers();

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Volunteers
            </h2>
            <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
              Prototype
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Volunteer registrations for Campus Meet 2026.{" "}
            {volunteers.length > 0 && (
              <span className="font-medium text-foreground">
                {volunteers.length} total
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Note banner */}
      <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-violet-500"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Migration required:</strong> Apply{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
            migrations/001_checkin_volunteers.sql
          </code>{" "}
          in your Supabase SQL editor to activate volunteer registrations.
        </div>
      </div>

      {/* Stats bar */}
      {volunteers.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Verified: </span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {volunteers.filter((v) => v.is_verified).length}
            </span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-border self-center" />
          <div className="text-sm">
            <span className="text-muted-foreground">Pending: </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {volunteers.filter((v) => !v.is_verified).length}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <VolunteersTable volunteers={volunteers} />
    </div>
  );
}
