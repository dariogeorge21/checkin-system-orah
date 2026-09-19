"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { VolunteersTable } from "@/components/volunteers/volunteers-table";
import type { VolunteerRegistration } from "@/components/volunteers/volunteers-table";
import { VolunteerSpotRegistrationModal } from "@/components/volunteers/volunteer-spot-registration-modal";
import { ExportCsvModal } from "@/components/export/export-csv-modal";
import {
  VOLUNTEER_CSV_COLUMNS,
  VOLUNTEER_SORT_OPTIONS,
  getVolunteerFilterOptions,
} from "@/components/export/volunteer-export-config";
import { Spinner } from "@/components/ui/spinner";

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  const volunteerFilterOptions = useMemo(() => {
    return getVolunteerFilterOptions(volunteers);
  }, [volunteers]);

  return (
    <div className="space-y-6">
      <title>Volunteers | Orah</title>

      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Volunteers
            </h2>
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Voluntary Fee / Donation
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            id="btn-new-volunteer-registration"
            onClick={() => setIsSpotModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            title="Register a new volunteer on the spot"
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
            id="btn-volunteers-export-csv"
            onClick={() => setIsExportModalOpen(true)}
            disabled={loading || volunteers.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer"
            title="Export volunteers data to CSV"
          >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>

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
          <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Verified: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {volunteers.filter((v) => v.is_verified).length}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border self-center" />
            <div className="text-sm">
              <span className="text-muted-foreground">Pending: </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {volunteers.filter((v) => !v.is_verified && v.registration_type === "ONLINE").length}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border self-center" />
            <div className="text-sm">
              <span className="text-muted-foreground">Offline: </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {volunteers.filter((v) => v.registration_type === "OFFLINE" || (v.registration_type as any) === "SPOT").length}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border self-center" />
            <div className="text-sm">
              <span className="text-muted-foreground">Fee Policy: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Voluntary Donation
              </span>
            </div>
          </div>

          {/* Table */}
          <VolunteersTable
            volunteers={volunteers}
            onVolunteerUpdated={() => fetchVolunteers(true)}
          />
        </>
      )}

      {/* Volunteer Spot Registration Modal */}
      <VolunteerSpotRegistrationModal
        open={isSpotModalOpen}
        onOpenChange={setIsSpotModalOpen}
        onSuccess={() => fetchVolunteers(true)}
      />

      {/* Export to CSV Modal */}
      <ExportCsvModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        title="Export Volunteers to CSV"
        description="Configure export filters, sort order, and preview sample records before exporting."
        defaultFilename={`orah-volunteers-${new Date().toISOString().split("T")[0]}.csv`}
        data={volunteers}
        columns={VOLUNTEER_CSV_COLUMNS}
        sortOptions={VOLUNTEER_SORT_OPTIONS}
        filterOptions={volunteerFilterOptions}
      />
    </div>
  );
}
