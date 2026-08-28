"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export type RegistrationType = "ONLINE" | "SPOT";

export interface Participant {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  dob: string;
  parish: string;
  diocese: string;
  affiliation: string;
  college: string | null;
  institute: string | null;
  year_of_study: string | null;
  address: string;
  registration_type: RegistrationType;
  is_verified: boolean;
  created_at: string;
}

const REGISTRATION_TYPE_LABELS: Record<RegistrationType, string> = {
  ONLINE: "Online",
  SPOT: "Spot",
};

function RegistrationTypeBadge({ type }: { type: RegistrationType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        type === "ONLINE"
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
      )}
    >
      {REGISTRATION_TYPE_LABELS[type]}
    </span>
  );
}

function VerifiedBadge({ is_verified }: { is_verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        is_verified
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          is_verified ? "bg-emerald-500" : "bg-amber-500"
        )}
      />
      {is_verified ? "Verified" : "Pending"}
    </span>
  );
}

interface ParticipantsTableProps {
  participants: Participant[];
}

const PAGE_SIZE = 20;

export function ParticipantsTable({ participants }: ParticipantsTableProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | RegistrationType>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "confirmed" | "pending">("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.parish.toLowerCase().includes(q);
      const matchesType =
        filterType === "ALL" || p.registration_type === filterType;
      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "confirmed" && p.confirmed) ||
        (filterStatus === "pending" && !p.confirmed);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [participants, search, filterType, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="participants-search"
            type="search"
            placeholder="Search by name, phone, email, parish…"
            value={search}
            onChange={handleSearch}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 focus:border-[oklch(0.55_0.22_270)]/50 transition-all"
          />
        </div>

        {/* Type filter */}
        <select
          id="filter-registration-type"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as typeof filterType); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all"
        >
          <option value="ALL">All Types</option>
          <option value="ONLINE">Online</option>
          <option value="SPOT">Spot</option>
        </select>

        {/* Status filter */}
        <select
          id="filter-status"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all"
        >
          <option value="ALL">All Status</option>
          <option value="confirmed">Approved</option>
          <option value="pending">Pending</option>
        </select>

        {/* Result count */}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Parish / Diocese</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Affiliation</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No participants found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((p, i) => (
                  <tr
                    key={p.id}
                    className="bg-background hover:bg-muted/30 transition-colors duration-100 group"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80 font-mono text-xs tabular-nums">
                      {p.phone}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-foreground/80">{p.parish}</div>
                      <div className="text-xs text-muted-foreground">{p.diocese}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-foreground/70">
                      {p.affiliation}
                      {p.college && (
                        <div className="text-xs text-muted-foreground">{p.college}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RegistrationTypeBadge type={p.registration_type} />
                    </td>
                    <td className="px-4 py-3">
                      <ConfirmedBadge confirmed={p.confirmed} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground tabular-nums">
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
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
              id="prev-page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              id="next-page"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
