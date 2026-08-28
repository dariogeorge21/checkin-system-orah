import { createClient } from "@/lib/supabase/server";
import { ParticipantsTable } from "@/components/participants/participants-table";
import type { Participant } from "@/components/participants/participants-table";

export const metadata = {
  title: "Participants | Orah",
};

async function getParticipants(): Promise<Participant[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, name, phone, email, gender, dob, parish, diocese, affiliation, college, institute, year_of_study, address, registration_type, confirmed, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch participants:", error.message);
    return [];
  }

  return (data as Participant[]) ?? [];
}

export default async function ParticipantsPage() {
  const participants = await getParticipants();

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Participants
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All registered participants for Campus Meet 2026.{" "}
            <span className="font-medium text-foreground">
              {participants.length} total
            </span>
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Approved: </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {participants.filter((p) => p.confirmed).length}
          </span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-border self-center" />
        <div className="text-sm">
          <span className="text-muted-foreground">Pending: </span>
          <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
            {participants.filter((p) => !p.confirmed && p.registration_type === "ONLINE").length}
          </span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-border self-center" />
        <div className="text-sm">
          <span className="text-muted-foreground">Spot: </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {participants.filter((p) => p.registration_type === "SPOT").length}
          </span>
        </div>
      </div>

      {/* Table */}
      <ParticipantsTable participants={participants} />
    </div>
  );
}
