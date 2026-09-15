"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ResourceRegistration } from "./resource-registration-types";
import { Spinner } from "@/components/ui/spinner";

const PAGE_SIZE = 20;

interface ResourcesTableProps {
  resources: ResourceRegistration[];
  onResourceUpdated?: () => void;
}

export function ResourcesTable({ resources, onResourceUpdated }: ResourcesTableProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "checked_in" | "pending">("ALL");
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        (r.from_location && r.from_location.toLowerCase().includes(q)) ||
        (r.session && r.session.toLowerCase().includes(q));

      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "checked_in" && r.is_checked_in) ||
        (filterStatus === "pending" && !r.is_checked_in);

      return matchesSearch && matchesStatus;
    });
  }, [resources, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Toggle checkin status
  const handleToggleCheckin = async (resource: ResourceRegistration) => {
    setActionLoadingId(resource.id);
    try {
      const res = await fetch("/api/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resource.id,
          is_checked_in: !resource.is_checked_in,
        }),
      });
      if (res.ok) {
        if (onResourceUpdated) onResourceUpdated();
      }
    } catch (err) {
      console.error("Error updating resource checkin:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete resource
  const handleDelete = async (resource: ResourceRegistration) => {
    if (!confirm(`Are you sure you want to remove ${resource.name}?`)) return;

    setActionLoadingId(resource.id);
    try {
      const res = await fetch(`/api/resources?id=${resource.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (onResourceUpdated) onResourceUpdated();
      }
    } catch (err) {
      console.error("Error deleting resource:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="resources-search"
            type="search"
            placeholder="Search by name, phone, from, session…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 focus:border-[oklch(0.55_0.22_270)]/50 transition-all"
          />
        </div>

        <select
          id="resources-filter-status"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as typeof filterStatus);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all cursor-pointer"
        >
          <option value="ALL">All Status</option>
          <option value="checked_in">Checked In</option>
          <option value="pending">Pending</option>
        </select>

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  From
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Session
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Fee
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {resources.length === 0
                          ? "No resource registrations yet."
                          : "No resource persons match your filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((r, i) => (
                  <tr
                    key={r.id}
                    className="bg-background hover:bg-muted/30 transition-colors duration-100"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>

                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{r.name}</span>
                        {r.notes && (
                          <span
                            title={`Notes: ${r.notes}`}
                            className="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground cursor-help"
                          >
                            ℹ
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-foreground/80 font-mono text-xs tabular-nums">
                      {r.phone || <span className="text-muted-foreground">—</span>}
                    </td>

                    <td className="px-4 py-3 text-sm text-foreground/80">
                      {r.from_location || <span className="text-muted-foreground">—</span>}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {r.session ? (
                        <span className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {r.session}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        No Fee
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          r.is_checked_in
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            r.is_checked_in ? "bg-emerald-500" : "bg-amber-500"
                          )}
                        />
                        {r.is_checked_in ? "Checked In" : "Pending"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {r.is_checked_in ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCheckin(r)}
                            disabled={actionLoadingId === r.id}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                            title="Revert check-in status"
                          >
                            {actionLoadingId === r.id ? <Spinner className="size-3" /> : "Revert"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleCheckin(r)}
                            disabled={actionLoadingId === r.id}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            {actionLoadingId === r.id ? (
                              <Spinner className="size-3" />
                            ) : (
                              "Check In"
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          disabled={actionLoadingId === r.id}
                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          title="Delete resource registration"
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
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              id="resources-prev-page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              id="resources-next-page"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

