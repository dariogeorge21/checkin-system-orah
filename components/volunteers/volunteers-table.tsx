"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { UnifiedAttendee, CheckinRecord, PaymentStatus } from "@/components/checkin/checkin-types";
import { CheckinModal } from "@/components/checkin/checkin-modal";

export type VolunteerRegistrationType = "ONLINE" | "OFFLINE" | "SPOT";

export interface VolunteerRegistration {
  id: string;
  name: string;
  phone: string;
  ministry: string;
  role: string;
  registration_type: VolunteerRegistrationType;
  is_verified: boolean;
  created_at: string;
  checkin?: CheckinRecord | null;
}

function VerifiedBadge({ is_verified, checkin }: { is_verified: boolean; checkin?: CheckinRecord | null }) {
  return (
    <div className="space-y-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          is_verified
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        )}
      >
        <span className={cn("size-1.5 rounded-full", is_verified ? "bg-emerald-500" : "bg-amber-500")} />
        {is_verified ? "Verified" : "Pending"}
      </span>
      {is_verified && checkin && (
        <span className="block text-[10px] text-muted-foreground font-medium">
          {checkin.payment_method || "Paid"} • ₹{checkin.amount_paid}
        </span>
      )}
    </div>
  );
}

function RegistrationTypeBadge({ type }: { type: VolunteerRegistrationType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        type === "ONLINE"
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
      )}
    >
      {type === "ONLINE" ? "Online" : "Offline"}
    </span>
  );
}

const PAGE_SIZE = 20;

interface VolunteersTableProps {
  volunteers: VolunteerRegistration[];
  onVolunteerUpdated?: () => void;
}

export function VolunteersTable({ volunteers, onVolunteerUpdated }: VolunteersTableProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | VolunteerRegistrationType>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "verified" | "pending">("ALL");
  const [filterPayment, setFilterPayment] = useState<"ALL" | PaymentStatus>("ALL");
  const [page, setPage] = useState(1);

  // Checkin modal state
  const [selectedAttendee, setSelectedAttendee] = useState<UnifiedAttendee | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return volunteers.filter((v) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.ministry.toLowerCase().includes(q) ||
        v.role.toLowerCase().includes(q);
      const matchesType = filterType === "ALL" || v.registration_type === filterType;
      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "verified" && v.is_verified) ||
        (filterStatus === "pending" && !v.is_verified);
      const matchesPayment =
        filterPayment === "ALL" ||
        (v.checkin && v.checkin.payment_status === filterPayment) ||
        (!v.checkin && filterPayment === "not_paid");
      return matchesSearch && matchesType && matchesStatus && matchesPayment;
    });
  }, [volunteers, search, filterType, filterStatus, filterPayment]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleOpenCheckin = (v: VolunteerRegistration) => {
    const attendee: UnifiedAttendee = {
      id: v.id,
      personType: "volunteer",
      name: v.name,
      phone: v.phone,
      ministry: v.ministry,
      role: v.role,
      registrationType: v.registration_type,
      createdAt: v.created_at,
      isCheckedIn: v.is_verified,
      checkin: v.checkin,
    };
    setSelectedAttendee(attendee);
    setIsCheckinModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="volunteers-search"
            type="search"
            placeholder="Search by name, phone, ministry, role…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 focus:border-[oklch(0.55_0.22_270)]/50 transition-all"
          />
        </div>

        <select
          id="volunteers-filter-type"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as typeof filterType); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all"
        >
          <option value="ALL">All Types</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
        </select>

        <select
          id="volunteers-filter-status"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all"
        >
          <option value="ALL">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>

        <select
          id="volunteers-filter-payment"
          value={filterPayment}
          onChange={(e) => { setFilterPayment(e.target.value as typeof filterPayment); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all"
        >
          <option value="ALL">All Payments</option>
          <option value="paid">Paid (₹600)</option>
          <option value="partially_paid">Partial</option>
          <option value="later_pay">Pay Later</option>
          <option value="not_paid">Unpaid</option>
        </select>

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
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ministry</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <polyline points="17 11 19 13 23 9" />
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {volunteers.length === 0
                          ? "No volunteer registrations yet."
                          : "No volunteers match your filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((v, i) => (
                  <tr
                    key={v.id}
                    className="bg-background hover:bg-muted/30 transition-colors duration-100"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                    <td className="px-4 py-3 text-foreground/80 font-mono text-xs tabular-nums">{v.phone}</td>
                    <td className="px-4 py-3 text-sm text-foreground/80">{v.ministry}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {v.role || "member"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RegistrationTypeBadge type={v.registration_type} />
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge is_verified={v.is_verified} checkin={v.checkin} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.is_verified ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCheckin(v)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        >
                          View / Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCheckin(v)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-2xs"
                        >
                          Check In
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              id="volunteers-prev-page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              id="volunteers-next-page"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Checkin Modal */}
      <CheckinModal
        attendee={selectedAttendee}
        open={isCheckinModalOpen}
        onOpenChange={setIsCheckinModalOpen}
        onSuccess={() => {
          if (onVolunteerUpdated) onVolunteerUpdated();
        }}
      />
    </div>
  );
}
