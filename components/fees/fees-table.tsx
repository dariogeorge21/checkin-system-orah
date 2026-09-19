"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Participant } from "@/components/participants/participants-table";
import { UnifiedAttendee } from "@/components/checkin/checkin-types";
import { CheckinModal } from "@/components/checkin/checkin-modal";

interface FeesTableProps {
  participants: Participant[];
  onParticipantUpdated?: () => void;
}

const PAGE_SIZE = 20;

export function FeesTable({ participants, onParticipantUpdated }: FeesTableProps) {
  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [regTypeFilter, setRegTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Checkin Modal state for managing/updating fee
  const [selectedAttendee, setSelectedAttendee] = useState<UnifiedAttendee | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  // Convert Participant to UnifiedAttendee for the modal
  const openFeeManager = (p: Participant) => {
    const attendee: UnifiedAttendee = {
      id: p.id,
      personType: "participant",
      name: p.name,
      phone: p.phone,
      email: p.email,
      gender: p.gender,
      dob: p.dob,
      parish: p.parish,
      diocese: p.diocese,
      affiliation: p.affiliation,
      college: p.college,
      institute: p.institute,
      year_of_study: p.year_of_study,
      address: p.address,
      registrationType: p.registration_type,
      createdAt: p.created_at,
      isCheckedIn: p.is_verified,
      group_number: p.group_number ?? p.checkin?.group_number,
      checkin: p.checkin,
    };
    setSelectedAttendee(attendee);
    setIsCheckinModalOpen(true);
  };

  // Filter & Search
  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();

    return participants.filter((p) => {
      // Search
      if (q) {
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesPhone = p.phone?.includes(q);
        const matchesEmail = p.email?.toLowerCase().includes(q);
        const matchesParish = p.parish?.toLowerCase().includes(q);
        const matchesDiocese = p.diocese?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesParish && !matchesDiocese) {
          return false;
        }
      }

      const isVerified = p.is_verified;
      const amountPaid = p.checkin?.amount_paid ?? (isVerified ? 600 : 0);
      const amountDue = p.checkin?.amount_due ?? 0;
      const status = p.checkin?.payment_status || (isVerified ? "paid" : "not_paid");
      const method = p.checkin?.payment_method || (isVerified ? "UPI" : null);

      // Payment Status Filter
      if (paymentStatusFilter !== "ALL") {
        if (paymentStatusFilter === "paid") {
          const isPaid = status === "paid" || (amountPaid >= 600 && amountDue === 0);
          if (!isPaid) return false;
        } else if (paymentStatusFilter === "partially_paid") {
          const isPartial = status === "partially_paid" || (amountPaid > 0 && amountDue > 0);
          if (!isPartial) return false;
        } else if (paymentStatusFilter === "later_pay") {
          if (status !== "later_pay") return false;
        } else if (paymentStatusFilter === "not_paid") {
          const isNotPaid = status === "not_paid" || (!isVerified && !p.checkin);
          if (!isNotPaid) return false;
        }
      }

      // Payment Method Filter
      if (paymentMethodFilter !== "ALL") {
        if (paymentMethodFilter === "CASH") {
          if (method !== "CASH" || amountPaid === 0) return false;
        } else if (paymentMethodFilter === "UPI") {
          if (method !== "UPI" || amountPaid === 0) return false;
        } else if (paymentMethodFilter === "NONE") {
          if (amountPaid > 0) return false;
        }
      }

      // Registration Type Filter
      if (regTypeFilter !== "ALL") {
        if (regTypeFilter === "ONLINE" && p.registration_type !== "ONLINE") return false;
        if (
          regTypeFilter === "OFFLINE" &&
          p.registration_type !== "OFFLINE" &&
          (p.registration_type as any) !== "SPOT"
        )
          return false;
      }

      return true;
    });
  }, [participants, search, paymentStatusFilter, paymentMethodFilter, regTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredParticipants.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredParticipants.slice(start, start + PAGE_SIZE);
  }, [filteredParticipants, page]);

  // Reset page when filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, val: string) => {
    setter(val);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 min-w-[180px] sm:max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search by name, phone, parish…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Payment Status Filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => handleFilterChange(setPaymentStatusFilter, e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex-1 sm:flex-initial min-w-[130px]"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="paid">Full Paid (₹600)</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="later_pay">Pay Later</option>
            <option value="not_paid">Not Paid / Pending</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => handleFilterChange(setPaymentMethodFilter, e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex-1 sm:flex-initial min-w-[120px]"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash Paid</option>
            <option value="UPI">UPI Paid</option>
            <option value="NONE">Unpaid / None</option>
          </select>

          {/* Registration Type Filter */}
          <select
            value={regTypeFilter}
            onChange={(e) => handleFilterChange(setRegTypeFilter, e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex-1 sm:flex-initial min-w-[110px]"
          >
            <option value="ALL">All Reg Types</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline / Spot</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground w-full sm:w-auto sm:ml-auto">
          Showing <strong className="text-foreground">{filteredParticipants.length}</strong> of {participants.length} participants
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Participant</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Check-in</th>
                <th className="px-3 py-3">Payment Status</th>
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Due</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No participants match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((p) => {
                  const isVerified = p.is_verified;
                  const chk = p.checkin;
                  const amountPaid = chk?.amount_paid != null ? chk.amount_paid : isVerified ? 600 : 0;
                  const amountDue = chk?.amount_due != null ? chk.amount_due : 0;
                  const status = chk?.payment_status || (isVerified ? "paid" : "not_paid");
                  const method = chk?.payment_method || (isVerified ? "UPI" : null);

                  const isFullPaid = status === "paid" || (amountPaid >= 600 && amountDue === 0);
                  const isPartial = status === "partially_paid" || (amountPaid > 0 && amountDue > 0);
                  const isPayLater = status === "later_pay";
                  const isNotPaid = !isFullPaid && !isPartial && !isPayLater;

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Parish */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-sm leading-snug">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{p.phone}</span>
                          {p.parish && (
                            <>
                              <span>•</span>
                              <span>{p.parish}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Reg Type */}
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            p.registration_type === "ONLINE"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          )}
                        >
                          {p.registration_type === "ONLINE" ? "Online" : "Offline"}
                        </span>
                      </td>

                      {/* Check-in status */}
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            isVerified
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", isVerified ? "bg-emerald-500" : "bg-amber-500")} />
                          {isVerified ? "Checked In" : "Pending"}
                        </span>
                      </td>

                      {/* Payment status badge */}
                      <td className="px-3 py-3">
                        {isFullPaid && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Full Paid
                          </span>
                        )}
                        {isPartial && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            Partially Paid
                          </span>
                        )}
                        {isPayLater && (
                          <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400">
                            Pay Later
                          </span>
                        )}
                        {isNotPaid && (
                          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                            Not Paid
                          </span>
                        )}
                      </td>

                      {/* Payment method */}
                      <td className="px-3 py-3">
                        {amountPaid > 0 && method ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
                              method === "CASH"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                            )}
                          >
                            {method === "CASH" ? "Cash" : "UPI"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="px-3 py-3 text-right">
                        <span className={cn("font-bold tabular-nums text-sm", amountPaid > 0 ? "text-foreground" : "text-muted-foreground/60")}>
                          ₹{amountPaid}
                        </span>
                      </td>

                      {/* Amount Due */}
                      <td className="px-3 py-3 text-right">
                        <span className={cn("tabular-nums text-xs font-semibold", amountDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/40")}>
                          {amountDue > 0 ? `₹${amountDue}` : "₹0"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openFeeManager(p)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted hover:border-primary/40 transition-all cursor-pointer shadow-2xs"
                          title="Manage or update fee payment for this participant"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          Manage Fee
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkin / Payment Modal */}
      <CheckinModal
        attendee={selectedAttendee}
        open={isCheckinModalOpen}
        onOpenChange={setIsCheckinModalOpen}
        onSuccess={() => {
          setIsCheckinModalOpen(false);
          onParticipantUpdated?.();
        }}
      />
    </div>
  );
}

