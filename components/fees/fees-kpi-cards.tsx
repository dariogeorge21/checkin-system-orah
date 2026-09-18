"use client";

import React, { useMemo } from "react";
import type { Participant } from "@/components/participants/participants-table";

interface FeesKpiCardsProps {
  participants: Participant[];
}

export function FeesKpiCards({ participants }: FeesKpiCardsProps) {
  const stats = useMemo(() => {
    let totalCollected = 0;
    let cashTotal = 0;
    let cashCount = 0;
    let upiTotal = 0;
    let upiCount = 0;

    let fullPaidCount = 0;
    let fullPaidAmount = 0;

    let partialPaidCount = 0;
    let partialPaidAmount = 0;
    let partialDueAmount = 0;

    let payLaterCount = 0;
    let payLaterDueAmount = 0;

    let notPaidCount = 0;

    for (const p of participants) {
      const isVerified = p.is_verified;
      const chk = p.checkin;
      const amountPaid = chk?.amount_paid != null ? chk.amount_paid : isVerified ? 600 : 0;
      const amountDue = chk?.amount_due != null ? chk.amount_due : 0;
      const status = chk?.payment_status || (isVerified ? "paid" : "not_paid");
      const method = chk?.payment_method || (isVerified ? "UPI" : null);

      totalCollected += amountPaid;

      // Method breakdown
      if (amountPaid > 0) {
        if (method === "CASH") {
          cashTotal += amountPaid;
          cashCount++;
        } else {
          // Default verified method is UPI if not cash
          upiTotal += amountPaid;
          upiCount++;
        }
      }

      // Status breakdown
      if (status === "paid" || (amountPaid >= 600 && amountDue === 0)) {
        fullPaidCount++;
        fullPaidAmount += amountPaid;
      } else if (status === "partially_paid" || (amountPaid > 0 && amountDue > 0)) {
        partialPaidCount++;
        partialPaidAmount += amountPaid;
        partialDueAmount += amountDue;
      } else if (status === "later_pay") {
        payLaterCount++;
        payLaterDueAmount += (amountDue > 0 ? amountDue : 600);
      } else {
        notPaidCount++;
      }
    }

    const expectedTotal = participants.length * 600;
    const collectionPercentage = expectedTotal > 0 ? Math.round((totalCollected / expectedTotal) * 100) : 0;

    return {
      totalParticipants: participants.length,
      totalCollected,
      expectedTotal,
      collectionPercentage,
      cashTotal,
      cashCount,
      upiTotal,
      upiCount,
      fullPaidCount,
      fullPaidAmount,
      partialPaidCount,
      partialPaidAmount,
      partialDueAmount,
      payLaterCount,
      payLaterDueAmount,
      notPaidCount,
    };
  }, [participants]);

  return (
    <div className="space-y-4">
      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 1. Total Collected */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Total Revenue
            </span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary">
              {stats.collectionPercentage}% Collected
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              ₹{stats.totalCollected.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Target: <strong className="text-foreground">₹{stats.expectedTotal.toLocaleString("en-IN")}</strong> ({stats.totalParticipants} participants)
          </div>
        </div>

        {/* 2. Cash Paid */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Cash Paid
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {stats.cashCount} payments
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              ₹{stats.cashTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Physical currency received at desk
          </div>
        </div>

        {/* 3. UPI Paid */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              UPI Paid
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
              {stats.upiCount} payments
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              ₹{stats.upiTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            QR / UPI transfers received
          </div>
        </div>

        {/* 4. Full Paid */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Full Paid (₹600)
            </span>
            <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              {stats.fullPaidCount} people
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              ₹{stats.fullPaidAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Fully cleared registration fee
          </div>
        </div>

        {/* 5. Partially Paid & Dues */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Partially Paid
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {stats.partialPaidCount} people
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              ₹{stats.partialPaidAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            Pending Due: ₹{stats.partialDueAmount.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Secondary Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Full Paid:</span>
            <strong className="text-foreground">{stats.fullPaidCount}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Partial Paid:</span>
            <strong className="text-foreground">{stats.partialPaidCount}</strong>
            {stats.partialDueAmount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">(₹{stats.partialDueAmount} due)</span>
            )}
          </div>
          {stats.payLaterCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Pay Later:</span>
              <strong className="text-foreground">{stats.payLaterCount}</strong>
              <span className="text-orange-600 dark:text-orange-400">(₹{stats.payLaterDueAmount} due)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Not Paid / Pending Arrival:</span>
            <strong className="text-foreground">{stats.notPaidCount}</strong>
            <span className="text-muted-foreground">(₹{(stats.notPaidCount * 600).toLocaleString("en-IN")} expected)</span>
          </div>
        </div>

        <div className="text-muted-foreground">
          Fee Standard: <strong className="text-foreground">₹600 / participant</strong>
        </div>
      </div>
    </div>
  );
}

