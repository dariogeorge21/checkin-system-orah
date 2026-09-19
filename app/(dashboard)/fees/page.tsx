"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Participant } from "@/components/participants/participants-table";
import { FeesKpiCards } from "@/components/fees/fees-kpi-cards";
import { FeesTable } from "@/components/fees/fees-table";
import { ExportCsvModal } from "@/components/export/export-csv-modal";
import {
  FEES_CSV_COLUMNS,
  FEES_SORT_OPTIONS,
  FEES_FILTER_OPTIONS,
} from "@/components/fees/fees-export-config";
import { Spinner } from "@/components/ui/spinner";

export default function FeesPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
      console.error("Error fetching participant fees:", err);
      setError(err?.message || "Failed to load participant data");
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
      <title>Fees Management | Orah</title>

      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Fees Management & Report
            </h2>
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Participants Only
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Financial breakdown of registration fees: Cash, UPI, Full Paid, Partially Paid, and Pending Dues.{" "}
            {!loading && (
              <span className="font-medium text-foreground">
                {participants.length} registered
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            id="btn-fees-export-csv"
            onClick={() => setIsExportModalOpen(true)}
            disabled={loading || participants.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
            title="Export fee collection report to CSV"
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
            Export Fees CSV
          </button>

          <button
            onClick={() => fetchParticipants(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh fee reports"
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

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted/20" />
        </div>
      ) : (
        <>
          {/* Financial KPI Summary Cards */}
          <FeesKpiCards participants={participants} />

          {/* Participant Fees Management Table */}
          <FeesTable
            participants={participants}
            onParticipantUpdated={() => fetchParticipants(true)}
          />
        </>
      )}

      {/* CSV Export Modal */}
      <ExportCsvModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        title="Export Participant Fees Report to CSV"
        description="Filter by payment method, payment status, and customize export parameters before downloading."
        defaultFilename={`orah-participant-fees-${new Date().toISOString().split("T")[0]}.csv`}
        data={participants}
        columns={FEES_CSV_COLUMNS}
        sortOptions={FEES_SORT_OPTIONS}
        filterOptions={FEES_FILTER_OPTIONS}
      />
    </div>
  );
}

