"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ResourcesTable } from "@/components/resources/resources-table";
import type { ResourceRegistration } from "@/components/resources/resource-registration-types";
import { ResourceRegistrationModal } from "@/components/resources/resource-registration-modal";
import { ExportCsvModal } from "@/components/export/export-csv-modal";
import {
  RESOURCE_CSV_COLUMNS,
  RESOURCE_SORT_OPTIONS,
  RESOURCE_FILTER_OPTIONS,
} from "@/components/export/resource-export-config";
import { Spinner } from "@/components/ui/spinner";

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pendingMigration, setPendingMigration] = useState(false);

  const fetchResources = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/resources", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch resources: ${res.statusText}`);
      }
      const data = await res.json();
      setResources(data.resources ?? []);
      if (data.pendingMigration) {
        setPendingMigration(true);
      } else {
        setPendingMigration(false);
      }
    } catch (err: any) {
      console.error("Error fetching resources:", err);
      setError(err?.message || "Failed to load resources");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const checkedInCount = resources.filter((r) => r.is_checked_in).length;
  const pendingCount = resources.filter((r) => !r.is_checked_in).length;

  return (
    <div className="space-y-6">
      <title>Resource Persons | Orah</title>

      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Resource Persons
            </h2>
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              No Fee Collection
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Speakers, animators, and guest registrations for Campus Meet 2026.{" "}
            {!loading && resources.length > 0 && (
              <span className="font-medium text-foreground">
                {resources.length} total
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            id="btn-new-resource-registration"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            title="Register a new resource person"
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
            Resource Registration
          </button>

          <button
            id="btn-resources-export-csv"
            onClick={() => setIsExportModalOpen(true)}
            disabled={loading || resources.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer"
            title="Export resources data to CSV"
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
            onClick={() => fetchResources(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh resource list"
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

      {/* Migration Notice Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-amber-500"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Database Migration:</strong> Apply{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold text-foreground">
            migrations/005_resource_registrations.sql
          </code>{" "}
          in your Supabase SQL editor to create the resource registrations table and permissions.
          {pendingMigration && (
            <span className="block mt-1 font-semibold text-amber-600 dark:text-amber-400">
              ⚠️ Table not detected in database yet. Please run the SQL migration script.
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <button
            onClick={() => fetchResources()}
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
              <span className="text-muted-foreground">Total Resources: </span>
              <span className="font-semibold text-foreground tabular-nums">
                {resources.length}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border self-center" />
            <div className="text-sm">
              <span className="text-muted-foreground">Checked In: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {checkedInCount}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border self-center" />
            <div className="text-sm">
              <span className="text-muted-foreground">Pending Arrival: </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {pendingCount}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border self-center" />
            <div className="text-sm">
              <span className="text-muted-foreground">Fee Collection: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ₹0 (Exempt)
              </span>
            </div>
          </div>

          {/* Table */}
          <ResourcesTable
            resources={resources}
            onResourceUpdated={() => fetchResources(true)}
          />
        </>
      )}

      {/* Resource Registration Modal */}
      <ResourceRegistrationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={() => fetchResources(true)}
      />

      {/* Export to CSV Modal */}
      <ExportCsvModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        title="Export Resource Persons to CSV"
        description="Configure export filters, sort order, and preview sample records before exporting."
        defaultFilename={`orah-resources-${new Date().toISOString().split("T")[0]}.csv`}
        data={resources}
        columns={RESOURCE_CSV_COLUMNS}
        sortOptions={RESOURCE_SORT_OPTIONS}
        filterOptions={RESOURCE_FILTER_OPTIONS}
      />
    </div>
  );
}

