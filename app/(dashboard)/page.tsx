import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/kpi-card";

async function getDashboardStats() {
  const supabase = await createClient();

  const [
    { count: approvedParticipants },
    { count: pendingParticipants },
    { count: spotParticipants },
    { count: totalParticipants },
    { count: approvedVolunteers },
    { count: pendingVolunteers },
    { count: spotVolunteers },
    { count: totalVolunteers },
  ] = await Promise.all([
    // Participants – confirmed (approved by reg team)
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("confirmed", true),
    // Participants – pending (not confirmed, online)
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("confirmed", false)
      .eq("registration_type", "ONLINE"),
    // Participants – spot registrations
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("registration_type", "SPOT"),
    // Participants – total
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true }),
    // Volunteers – approved
    supabase
      .from("volunteer_registrations")
      .select("*", { count: "exact", head: true })
      .eq("confirmed", true),
    // Volunteers – pending
    supabase
      .from("volunteer_registrations")
      .select("*", { count: "exact", head: true })
      .eq("confirmed", false)
      .eq("registration_type", "ONLINE"),
    // Volunteers – spot
    supabase
      .from("volunteer_registrations")
      .select("*", { count: "exact", head: true })
      .eq("registration_type", "SPOT"),
    // Volunteers – total
    supabase
      .from("volunteer_registrations")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    approvedParticipants: approvedParticipants ?? 0,
    pendingParticipants: pendingParticipants ?? 0,
    spotParticipants: spotParticipants ?? 0,
    totalParticipants: totalParticipants ?? 0,
    approvedVolunteers: approvedVolunteers ?? 0,
    pendingVolunteers: pendingVolunteers ?? 0,
    spotVolunteers: spotVolunteers ?? 0,
    totalVolunteers: totalVolunteers ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Registration Overview
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current registration status for Campus Meet 2026.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 rounded-2xl border border-border bg-muted/30 p-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Total Participants: </span>
          <span className="font-semibold text-foreground tabular-nums">{stats.totalParticipants}</span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-border self-center" />
        <div className="text-sm">
          <span className="text-muted-foreground">Total Volunteers: </span>
          <span className="font-semibold text-foreground tabular-nums">{stats.totalVolunteers}</span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-border self-center" />
        <div className="text-sm">
          <span className="text-muted-foreground">Grand Total: </span>
          <span className="font-semibold text-foreground tabular-nums">
            {stats.totalParticipants + stats.totalVolunteers}
          </span>
        </div>
      </div>

      {/* Participants KPIs */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Participants
          </h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            id="kpi-participants-approved"
            label="Approved Registrations"
            sublabel="Confirmed by registration team"
            count={stats.approvedParticipants}
            variant="green"
            badge="Confirmed"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <KpiCard
            id="kpi-participants-pending"
            label="Pending Approvals"
            sublabel="Online registrations awaiting approval"
            count={stats.pendingParticipants}
            variant="amber"
            badge="Pending"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <KpiCard
            id="kpi-participants-spot"
            label="Spot Registrations"
            sublabel="Registered at the event desk"
            count={stats.spotParticipants}
            variant="blue"
            badge="Spot"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Volunteers KPIs */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Volunteers
          </h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            id="kpi-volunteers-approved"
            label="Approved Volunteers"
            sublabel="Confirmed by registration team"
            count={stats.approvedVolunteers}
            variant="indigo"
            badge="Confirmed"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
            }
          />
          <KpiCard
            id="kpi-volunteers-pending"
            label="Pending Volunteers"
            sublabel="Awaiting confirmation"
            count={stats.pendingVolunteers}
            variant="rose"
            badge="Pending"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          />
          <KpiCard
            id="kpi-volunteers-spot"
            label="Spot Volunteers"
            sublabel="Walk-in volunteer registrations"
            count={stats.spotVolunteers}
            variant="violet"
            badge="Spot"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            }
          />
        </div>
      </section>
    </div>
  );
}
