"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  VolunteerSpotFormData,
  VolunteerSpotPaymentData,
  INITIAL_VOLUNTEER_FORM_DATA,
  INITIAL_VOLUNTEER_PAYMENT_DATA,
  MINISTRY_OPTIONS,
  ROLE_OPTIONS,
  sanitizeInput,
  handleVolunteerConditionalResets,
  validateVolunteerSpotForm,
} from "./volunteer-spot-registration-types";
import { PaymentMethod, PaymentStatus } from "@/components/participants/spot-registration-types";
import { PaymentQrCode } from "@/components/participants/payment-qr-code";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface VolunteerSpotRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VolunteerSpotRegistrationModal({
  open,
  onOpenChange,
  onSuccess,
}: VolunteerSpotRegistrationModalProps) {
  // Form State
  const [formData, setFormData] = useState<VolunteerSpotFormData>(INITIAL_VOLUNTEER_FORM_DATA);
  const [paymentData, setPaymentData] = useState<VolunteerSpotPaymentData>(INITIAL_VOLUNTEER_PAYMENT_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<"form" | "payment" | "success">("form");

  // Submission State
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdVolunteer, setCreatedVolunteer] = useState<any>(null);

  // Field change handler with sanitization
  const handleInputChange = (
    field: keyof VolunteerSpotFormData,
    rawValue: string | boolean
  ) => {
    let cleanValue: string | boolean;
    if (typeof rawValue === "string") {
      cleanValue = sanitizeInput(rawValue);
      setFormData((prev) => handleVolunteerConditionalResets(prev, field, cleanValue as string));
    } else {
      cleanValue = rawValue;
      setFormData((prev) => ({ ...prev, [field]: cleanValue }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Payment State Handlers
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentData((prev) => ({ ...prev, method }));
  };

  const handlePaymentStatusChange = (status: PaymentStatus) => {
    let amountPaid = prevAmount(paymentData.amountPaid);
    let amountDue = 600;

    if (status === "paid") {
      amountPaid = 600;
      amountDue = 0;
    } else if (status === "not_paid" || status === "later_pay") {
      amountPaid = 0;
      amountDue = 600;
    } else if (status === "partially_paid") {
      if (amountPaid <= 0 || amountPaid >= 600) {
        amountPaid = 300;
      }
      amountDue = 600 - amountPaid;
    }

    setPaymentData((prev) => ({
      ...prev,
      status,
      amountPaid,
      amountDue,
    }));
  };

  function prevAmount(current: number): number {
    return current > 0 && current < 600 ? current : 300;
  }

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

  // Step 1 -> Step 2 transition
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateVolunteerSpotForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstKey = Object.keys(validationErrors)[0];
      const element = document.getElementById(`volunteer-spot-${firstKey}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
      return;
    }

    setErrors({});
    setCurrentStep("payment");
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    setLoading(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/volunteers/spot-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, paymentData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete volunteer spot registration.");
      }

      setCreatedVolunteer(data.volunteer);
      setCurrentStep("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Volunteer submission error:", err);
      setSubmitError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Reset and register another
  const handleRegisterAnother = () => {
    setFormData(INITIAL_VOLUNTEER_FORM_DATA);
    setPaymentData(INITIAL_VOLUNTEER_PAYMENT_DATA);
    setErrors({});
    setSubmitError(null);
    setCreatedVolunteer(null);
    setCurrentStep("form");
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after transition finishes
    setTimeout(() => {
      handleRegisterAnother();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl sm:rounded-3xl"
        aria-describedby="volunteer-spot-reg-description"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs">
                  SPOT
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  New Volunteer Registration
                </DialogTitle>
              </div>
              <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Auto-Approval
              </span>
            </div>
            <DialogDescription id="volunteer-spot-reg-description" className="text-xs text-muted-foreground mt-1">
              Campus Meet 2026 • Front-desk spot registration with instant payment collection and check-in.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Tabs (Form vs Payment) */}
          {currentStep !== "success" && (
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCurrentStep("form")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
                  currentStep === "form"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-background/20 text-[10px]">
                  1
                </span>
                Volunteer Details
              </button>
              <button
                type="button"
                onClick={handleProceedToPayment}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
                  currentStep === "payment"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-background/20 text-[10px]">
                  2
                </span>
                Payment & Check-in
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {submitError && (
            <div className="p-3.5 text-xs rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between">
              <span>{submitError}</span>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="font-bold hover:opacity-75"
              >
                ✕
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 1: VOLUNTEER FORM                                       */}
          {/* ============================================================ */}
          {currentStep === "form" && (
            <form id="volunteer-spot-form" onSubmit={handleProceedToPayment} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-md bg-violet-600 text-white font-bold text-xs">
                    1
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    Volunteer Information
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="volunteer-spot-name"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="volunteer-spot-name"
                      type="text"
                      placeholder="e.g. John Mathew"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.name ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    />
                    {errors.name && (
                      <p className="text-[11px] font-medium text-destructive">{errors.name}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="volunteer-spot-phone"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="volunteer-spot-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.phone ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    />
                    {errors.phone && (
                      <p className="text-[11px] font-medium text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  {/* Ministry Selection */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="volunteer-spot-ministry"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Ministry <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="volunteer-spot-ministry"
                      value={formData.ministry}
                      onChange={(e) => handleInputChange("ministry", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.ministry ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    >
                      <option value="">Select Ministry</option>
                      {MINISTRY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {errors.ministry && (
                      <p className="text-[11px] font-medium text-destructive">{errors.ministry}</p>
                    )}
                  </div>

                  {/* Conditional: Ministry === "Other" */}
                  {formData.ministry === "Other" && (
                    <div className="space-y-1.5 sm:col-span-2 p-3.5 rounded-xl bg-muted/30 border border-border">
                      <label
                        htmlFor="volunteer-spot-ministryOther"
                        className="text-xs font-semibold text-foreground flex items-center gap-1"
                      >
                        Specify Ministry <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="volunteer-spot-ministryOther"
                        type="text"
                        placeholder="e.g. Media & Communications"
                        value={formData.ministryOther}
                        onChange={(e) => handleInputChange("ministryOther", e.target.value)}
                        className={cn(
                          "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                          errors.ministryOther
                            ? "border-destructive focus:ring-destructive/30"
                            : "border-border"
                        )}
                      />
                      {errors.ministryOther && (
                        <p className="text-[11px] font-medium text-destructive">
                          {errors.ministryOther}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Role (Default: Member, else Coordinator) */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      Role <span className="text-destructive">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {ROLE_OPTIONS.map((r) => {
                        const isSelected = formData.role === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleInputChange("role", r)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                              isSelected
                                ? "border-violet-600 bg-violet-500/10 ring-2 ring-violet-500/20 text-foreground font-semibold"
                                : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{r}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {r === "Member" ? "Default team volunteer" : "Team lead / Coordinator"}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "size-4 rounded-full border flex items-center justify-center transition-all",
                                isSelected
                                  ? "border-violet-600 bg-violet-600 text-white"
                                  : "border-muted-foreground/40"
                              )}
                            >
                              {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.role && (
                      <p className="text-[11px] font-medium text-destructive">{errors.role}</p>
                    )}
                  </div>

                  {/* Desk Confirmation checkbox */}
                  <div className="sm:col-span-2 pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.confirmed}
                        onChange={(e) => handleInputChange("confirmed", e.target.checked)}
                        className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-foreground/90 leading-tight">
                        I confirm that the volunteer&apos;s details provided above have been verified at the desk.
                      </span>
                    </label>
                    {errors.confirmed && (
                      <p className="text-[11px] font-medium text-destructive mt-1">
                        {errors.confirmed}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* STEP 2: PAYMENT & CHECK-IN                                   */}
          {/* ============================================================ */}
          {currentStep === "payment" && (
            <div className="space-y-6">
              {/* Fee banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Standard Volunteer Fee</h4>
                  <p className="text-xs text-muted-foreground">Orah Campus Meet 2026</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-foreground tabular-nums">₹600</span>
                  <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                    Per Volunteer
                  </span>
                </div>
              </div>

              {/* 1. Payment Status Selector */}
              <div className="space-y-3">
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
                      htmlFor="volunteer-spot-partial-amount"
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
                      id="volunteer-spot-partial-amount"
                      type="number"
                      min={1}
                      max={599}
                      value={paymentData.amountPaid || ""}
                      onChange={(e) => handlePartialAmountChange(e.target.value)}
                      placeholder="Enter amount collected"
                      className="w-full rounded-lg border border-border bg-background pl-8 pr-4 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* Quick partial chips */}
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
              <div className="space-y-3">
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
                    Cash Collection
                  </button>
                </div>
              </div>

              {/* 3. Dynamic UPI QR Code (When UPI is selected) */}
              {paymentData.method === "UPI" && (
                paymentData.amountPaid > 0 ? (
                  <PaymentQrCode
                    amount={paymentData.amountPaid}
                    note={`${formData.name.slice(0, 15)} Vol Reg`}
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

              {/* Payment Notes */}
              <div className="space-y-1.5">
                <label
                  htmlFor="volunteer-spot-payment-note"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
                  <span>Payment / Failure / Audit Notes</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <textarea
                  id="volunteer-spot-payment-note"
                  rows={2}
                  placeholder="e.g. Cash handed to desk, UPI Ref #123456, or note"
                  value={paymentData.note}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      note: sanitizeInput(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all"
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: SUCCESS CELEBRATION                                  */}
          {/* ============================================================ */}
          {currentStep === "success" && (
            <div className="py-6 flex flex-col items-center text-center space-y-5">
              {/* Success Badge */}
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
                  Registration & Check-in Complete!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Volunteer has been registered with type <strong>OFFLINE</strong>, verified, and checked in to the event.
                </p>
              </div>

              {/* Volunteer Summary Card */}
              {createdVolunteer && (
                <div className="w-full max-w-md p-4 rounded-2xl border border-border bg-muted/20 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <span className="font-bold text-foreground text-sm block">
                        {createdVolunteer.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {createdVolunteer.role}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      ✓ Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Phone</span>
                      <span className="font-mono font-medium text-foreground">
                        {createdVolunteer.phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Ministry</span>
                      <span className="font-medium text-foreground truncate block">
                        {createdVolunteer.ministry}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[10px]">Payment Recorded</span>
                      <span className="font-semibold text-foreground">
                        {paymentData.method} • {paymentData.status.toUpperCase()} (₹
                        {paymentData.amountPaid})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRegisterAnother}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  + Register Another Volunteer
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {currentStep !== "success" && (
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
            {currentStep === "form" ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="volunteer-spot-form"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Next: Payment & Check-in →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentStep("form")}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {loading && <Spinner className="size-3.5" />}
                  Complete Registration & Check-in
                </button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
