"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ParticipantsTable } from "@/components/participants/participants-table";
import type { Participant } from "@/components/participants/participants-table";
import { SpotRegistrationModal } from "@/components/participants/spot-registration-modal";
import { Spinner } from "@/components/ui/spinner";

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);

  const fetchParticipants = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/participants", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch participants: ${res.statusText}`);
      }
      const data = await res.json();
      setParticipants(data.participants ?? []);
    } catch (err: any) {
      console.error("Error fetching participants:", err);
      setError(err?.message || "Failed to load participants");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return (
    <div className="space-y-6">
      <title>Participants | Orah</title>

      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Participants
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All registered participants for Campus Meet 2026.{" "}
            {!loading && (
              <span className="font-medium text-foreground">
                {participants.length} total
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            id="btn-new-registration"
            onClick={() => setIsSpotModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            title="Register a new participant on the spot"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Registration
          </button>

          <button
            onClick={() => fetchParticipants(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh participants"
          >
            {refreshing ? (
              <Spinner className="size-3.5" />
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <button
            onClick={() => fetchParticipants()}
            className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted/40" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted/20" />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Verified: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {participants.filter((p) => p.is_verified).length}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border self-center" />
            <div className="text-sm">
              <span className="text-muted-foreground">Pending: </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {participants.filter((p) => !p.is_verified && p.registration_type === "ONLINE").length}
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
        </>
      )}

      {/* Spot Registration Modal */}
      <SpotRegistrationModal
        open={isSpotModalOpen}
        onOpenChange={setIsSpotModalOpen}
        onSuccess={() => fetchParticipants(true)}
      />
    </div>
  );
}
