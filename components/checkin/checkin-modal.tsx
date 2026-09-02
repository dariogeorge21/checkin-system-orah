"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  UnifiedAttendee,
  CheckinPaymentData,
  PaymentMethod,
  PaymentStatus,
} from "./checkin-types";
import { PaymentQrCode } from "@/components/participants/payment-qr-code";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface CheckinModalProps {
  attendee: UnifiedAttendee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedAttendee: UnifiedAttendee) => void;
  onScanNext?: () => void;
}

export function CheckinModal({
  attendee,
  open,
  onOpenChange,
  onSuccess,
  onScanNext,
}: CheckinModalProps) {
  const [paymentData, setPaymentData] = useState<CheckinPaymentData>({
    method: "UPI",
    status: "paid",
    amountPaid: 600,
    amountDue: 0,
    note: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Sync state when attendee opens
  useEffect(() => {
    if (attendee) {
      setError(null);
      setSuccessData(null);
      if (attendee.isCheckedIn && attendee.checkin) {
        setPaymentData({
          method: attendee.checkin.payment_method || "UPI",
          status: attendee.checkin.payment_status || "paid",
          amountPaid: attendee.checkin.amount_paid ?? 600,
          amountDue: attendee.checkin.amount_due ?? 0,
          note: attendee.checkin.payment_note || "",
        });
      } else {
        setPaymentData({
          method: "UPI",
          status: "paid",
          amountPaid: 600,
          amountDue: 0,
          note: "",
        });
      }
    }
  }, [attendee, open]);

  if (!attendee) return null;

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentData((prev) => ({ ...prev, method }));
  };

  const handlePaymentStatusChange = (status: PaymentStatus) => {
    let amountPaid = 600;
    let amountDue = 0;

    if (status === "paid") {
      amountPaid = 600;
      amountDue = 0;
    } else if (status === "not_paid" || status === "later_pay") {
      amountPaid = 0;
      amountDue = 600;
    } else if (status === "partially_paid") {
      amountPaid = paymentData.amountPaid > 0 && paymentData.amountPaid < 600 ? paymentData.amountPaid : 300;
      amountDue = 600 - amountPaid;
    }

    setPaymentData((prev) => ({
      ...prev,
      status,
      amountPaid,
      amountDue,
    }));
  };

  const handlePartialAmountChange = (valStr: string) => {
    const parsed = parseInt(valStr.replace(/\D/g, ""), 10) || 0;
    const clampedPaid = Math.min(600, Math.max(0, parsed));
    const due = 600 - clampedPaid;

    setPaymentData((prev) => ({
      ...prev,
      amountPaid: clampedPaid,
      amountDue: due,
      status: clampedPaid === 600 ? "paid" : clampedPaid === 0 ? "not_paid" : "partially_paid",
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personType: attendee.personType,
          registrationId: attendee.id,
          paymentData,
          registrationOption: "full",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete check-in.");
      }

      const updatedAttendee: UnifiedAttendee = {
        ...attendee,
        isCheckedIn: true,
        checkin: data.checkin,
      };

      setSuccessData(data);
      if (onSuccess) onSuccess(updatedAttendee);
    } catch (err: any) {
      console.error("Check-in error:", err);
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSuccessData(null);
      setError(null);
    }, 200);
  };

  const isAlreadyCheckedIn = attendee.isCheckedIn;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl sm:rounded-3xl"
        aria-describedby="checkin-modal-desc"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg font-bold text-xs",
                    attendee.personType === "participant"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  )}
                >
                  {attendee.personType === "participant" ? "PART" : "VOL"}
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {isAlreadyCheckedIn ? "Update Check-in" : "Front Desk Check-in"}
                </DialogTitle>
              </div>

              <span
                className={cn(
                  "text-xs px-2.5 py-1 font-semibold rounded-full",
                  isAlreadyCheckedIn
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}
              >
                {isAlreadyCheckedIn ? "✓ Already Checked In" : "Pending Check-in"}
              </span>
            </div>
            <DialogDescription id="checkin-modal-desc" className="text-xs text-muted-foreground mt-1">
              Verify attendee identity, collect the ₹600 registration fee, and confirm entry.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="p-3.5 text-xs rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="font-bold hover:opacity-75 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Success View */}
          {successData ? (
            <div className="py-6 flex flex-col items-center text-center space-y-5">
              <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Check-in Approved & Verified!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {attendee.name} is confirmed and checked in for Campus Meet 2026.
                </p>
              </div>

              {/* Attendee Confirmation Card */}
              <div className="w-full max-w-md p-4 rounded-2xl border border-border bg-muted/20 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <span className="font-bold text-foreground text-sm block">
                      {attendee.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {attendee.personType} • {attendee.registrationType}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    ✓ Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Phone</span>
                    <span className="font-mono font-medium text-foreground">
                      {attendee.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Parish / Ministry</span>
                    <span className="font-medium text-foreground truncate block">
                      {attendee.parish || attendee.ministry || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Payment Recorded</span>
                    <span className="font-semibold text-foreground">
                      {paymentData.method} • {paymentData.status.toUpperCase()} (₹{paymentData.amountPaid})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Due Balance</span>
                    <span className={cn("font-semibold", paymentData.amountDue > 0 ? "text-amber-600" : "text-emerald-600")}>
                      ₹{paymentData.amountDue}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                {onScanNext && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onScanNext();
                    }}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="14" height="14" x="5" y="5" rx="2" />
                      <path d="M9 9h6v6H9z" />
                    </svg>
                    Scan Next Ticket
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className={cn(
                    "px-6 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm",
                    onScanNext
                      ? "border border-border bg-background text-foreground hover:bg-muted"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {onScanNext ? "Close" : "Done (Next Attendee)"}
                </button>
              </div>
            </div>
          ) : (
            /* Check-in Form View */
            <div className="space-y-5">
              {/* Attendee Info Card */}
              <div className="p-4 rounded-2xl border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-foreground">{attendee.name}</span>
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                        attendee.registrationType === "ONLINE"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      )}
                    >
                      {attendee.registrationType}
                    </span>

                    {(attendee.ticketId || attendee.ticket?.id) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        🎟️ Ticket #{String(attendee.ticketId || attendee.ticket?.id).slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">{attendee.phone}</span>
                    {attendee.email && <span>• {attendee.email}</span>}
                    {(attendee.parish || attendee.ministry) && (
                      <span>• {attendee.parish || attendee.ministry}</span>
                    )}
                    {attendee.college && (
                      <span>• {attendee.college}</span>
                    )}
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-border sm:pl-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Event Fee
                  </span>
                  <span className="text-xl font-extrabold text-foreground tabular-nums">₹600</span>
                </div>
              </div>


              {/* 1. Payment Status Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Payment Status
                  </label>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-muted-foreground">
                      Collected: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">₹{paymentData.amountPaid}</strong>
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      Due: <strong className={cn("tabular-nums", paymentData.amountDue > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-foreground")}>₹{paymentData.amountDue}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange("paid")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      paymentData.status === "paid"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 font-bold"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    )}
                  >
                    ✓ Full Paid (₹600)
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange("partially_paid")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      paymentData.status === "partially_paid"
                        ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30 font-bold"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    )}
                  >
                    Half Paid (₹300)
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange("later_pay")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      paymentData.status === "later_pay"
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30 font-bold"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    )}
                  >
                    Pay Later
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange("not_paid")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      paymentData.status === "not_paid"
                        ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30 font-bold"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    )}
                  >
                    Unpaid
                  </button>
                </div>
              </div>

              {/* Partial Amount Input */}
              {paymentData.status === "partially_paid" && (
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="partial-amount"
                      className="text-xs font-semibold text-foreground"
                    >
                      Amount Collected (₹)
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Balance Due:{" "}
                      <span className="font-bold text-destructive tabular-nums">
                        ₹{paymentData.amountDue}
                      </span>
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                      ₹
                    </span>
                    <input
                      id="partial-amount"
                      type="number"
                      min={1}
                      max={599}
                      value={paymentData.amountPaid || ""}
                      onChange={(e) => handlePartialAmountChange(e.target.value)}
                      placeholder="Enter amount collected"
                      className="w-full rounded-lg border border-border bg-background pl-8 pr-4 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Quick set:</span>
                    {[100, 200, 300, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handlePartialAmountChange(String(amt))}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-semibold rounded-md border cursor-pointer transition-all",
                          paymentData.amountPaid === amt
                            ? "border-blue-500 bg-blue-500 text-white shadow-xs"
                            : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Payment Method Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange("UPI")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer",
                      paymentData.method === "UPI"
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                        : "border-border bg-background hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                      <path d="M12 18h.01" />
                    </svg>
                    UPI / QR Code
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange("CASH")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer",
                      paymentData.method === "CASH"
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                        : "border-border bg-background hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="12" x="2" y="6" rx="2" />
                      <circle cx="12" cy="12" r="2" />
                      <path d="M6 12h.01M18 12h.01" />
                    </svg>
                    Cash Handover
                  </button>
                </div>
              </div>

              {/* 3. Dynamic UPI QR Code (When UPI Selected) */}
              {paymentData.method === "UPI" && (
                paymentData.amountPaid > 0 ? (
                  <PaymentQrCode
                    amount={paymentData.amountPaid}
                    note={`${attendee.name.slice(0, 15)} Reg Fee`}
                  />
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 text-center space-y-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Pay Later / Unpaid Selected (₹0 Due Now)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      No UPI QR payment required right now. The ₹600 registration fee balance is recorded as due.
                    </p>
                  </div>
                )
              )}

              {/* Desk Notes */}
              <div className="space-y-1.5">
                <label
                  htmlFor="checkin-note"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
                  <span>Desk Notes / Remarks</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <input
                  id="checkin-note"
                  type="text"
                  placeholder="e.g. Cash collected by Dario, UPI Ref #987654, Token #12 issued"
                  value={paymentData.note || ""}
                  onChange={(e) =>
                    setPaymentData((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!successData && (
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shadow-md"
            >
              {loading && <Spinner className="size-3.5" />}
              {isAlreadyCheckedIn ? "Update Check-in" : "Approve & Check In Attendee"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
