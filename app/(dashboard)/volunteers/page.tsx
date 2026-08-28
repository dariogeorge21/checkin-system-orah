"use client";

import React, { useState, useEffect, useCallback } from "react";
import { VolunteersTable } from "@/components/volunteers/volunteers-table";
import type { VolunteerRegistration } from "@/components/volunteers/volunteers-table";
import { Spinner } from "@/components/ui/spinner";

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/volunteers", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch volunteers: ${res.statusText}`);
      }
      const data = await res.json();
      setVolunteers(data.volunteers ?? []);
    } catch (err: any) {
      console.error("Error fetching volunteers:", err);
      setError(err?.message || "Failed to load volunteers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  return (
    <div className="space-y-6">
      <title>Volunteers | Orah</title>

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
            {!loading && volunteers.length > 0 && (
              <span className="font-medium text-foreground">
                {volunteers.length} total
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => fetchVolunteers(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer"
          title="Refresh volunteers"
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

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <button
            onClick={() => fetchVolunteers()}
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
        </>
      )}
    </div>
  );
}
