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
  SpotRegistrationFormData,
  SpotPaymentData,
  INITIAL_FORM_DATA,
  INITIAL_PAYMENT_DATA,
  AFFILIATION_OPTIONS,
  COLLEGE_OPTIONS,
  YEAR_OF_STUDY_OPTIONS,
  INSTITUTE_OPTIONS,
  sanitizeInput,
  handleConditionalResets,
  validateSpotRegistrationForm,
  PaymentMethod,
  PaymentStatus,
} from "./spot-registration-types";
import { PaymentQrCode } from "./payment-qr-code";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface SpotRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SpotRegistrationModal({
  open,
  onOpenChange,
  onSuccess,
}: SpotRegistrationModalProps) {
  // Form State
  const [formData, setFormData] = useState<SpotRegistrationFormData>(INITIAL_FORM_DATA);
  const [paymentData, setPaymentData] = useState<SpotPaymentData>(INITIAL_PAYMENT_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<"form" | "payment" | "success">("form");

  // Submission State
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdParticipant, setCreatedParticipant] = useState<any>(null);

  // Field change handler with sanitization
  const handleInputChange = (
    field: keyof SpotRegistrationFormData,
    rawValue: string | boolean
  ) => {
    let cleanValue: string | boolean;
    if (typeof rawValue === "string") {
      cleanValue = sanitizeInput(rawValue);
      setFormData((prev) => handleConditionalResets(prev, field, cleanValue as string));
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
    const validationErrors = validateSpotRegistrationForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstKey = Object.keys(validationErrors)[0];
      const element = document.getElementById(`spot-${firstKey}`);
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
      const res = await fetch("/api/participants/spot-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, paymentData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete spot registration.");
      }

      setCreatedParticipant(data.participant);
      setCurrentStep("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Submission error:", err);
      setSubmitError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Reset and register another
  const handleRegisterAnother = () => {
    setFormData(INITIAL_FORM_DATA);
    setPaymentData(INITIAL_PAYMENT_DATA);
    setErrors({});
    setSubmitError(null);
    setCreatedParticipant(null);
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
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl sm:rounded-3xl"
        aria-describedby="spot-reg-description"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                  SPOT
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  New Participant Registration
                </DialogTitle>
              </div>
              <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Auto-Approval
              </span>
            </div>
            <DialogDescription id="spot-reg-description" className="text-xs text-muted-foreground mt-1">
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
                Participant Details
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
          {/* STEP 1: PARTICIPANT FORM                                     */}
          {/* ============================================================ */}
          {currentStep === "form" && (
            <form id="spot-form" onSubmit={handleProceedToPayment} className="space-y-6">
              {/* SECTION 1 — Personal Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                    1
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    Personal Details
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="spot-name"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="spot-name"
                      type="text"
                      placeholder="Your Name"
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

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="spot-dob"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Date of Birth <span className="text-destructive">*</span>
                      <span className="text-[10px] text-muted-foreground font-normal">(2000–2008)</span>
                    </label>
                    <input
                      id="spot-dob"
                      type="date"
                      placeholder="DD/MM/YYYY"
                      value={formData.dob}
                      onChange={(e) => handleInputChange("dob", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.dob ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    />
                    {errors.dob && (
                      <p className="text-[11px] font-medium text-destructive">{errors.dob}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="spot-gender"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Gender <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="spot-gender"
                      value={formData.gender}
                      onChange={(e) => handleInputChange("gender", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.gender ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    {errors.gender && (
                      <p className="text-[11px] font-medium text-destructive">{errors.gender}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="spot-phone"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="spot-phone"
                      type="tel"
                      placeholder="+91 97654321"
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

                  {/* Email Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="spot-email"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="spot-email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.email ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    />
                    {errors.email && (
                      <p className="text-[11px] font-medium text-destructive">{errors.email}</p>
                    )}
                  </div>

                  {/* Affiliation */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="spot-affiliation"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Affiliation <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="spot-affiliation"
                      value={formData.affiliation}
                      onChange={(e) => handleInputChange("affiliation", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.affiliation ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    >
                      <option value="">Select Affiliation</option>
                      {AFFILIATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {errors.affiliation && (
                      <p className="text-[11px] font-medium text-destructive">{errors.affiliation}</p>
                    )}
                  </div>

                  {/* Conditional: Affiliation === "Other" */}
                  {formData.affiliation === "Other" && (
                    <div className="space-y-1.5 sm:col-span-2 p-3 rounded-xl bg-muted/30 border border-border">
                      <label
                        htmlFor="spot-affiliationOther"
                        className="text-xs font-semibold text-foreground flex items-center gap-1"
                      >
                        Please specify <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="spot-affiliationOther"
                        type="text"
                        placeholder="e.g. Research Scholar"
                        value={formData.affiliationOther}
                        onChange={(e) => handleInputChange("affiliationOther", e.target.value)}
                        className={cn(
                          "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                          errors.affiliationOther
                            ? "border-destructive focus:ring-destructive/30"
                            : "border-border"
                        )}
                      />
                      {errors.affiliationOther && (
                        <p className="text-[11px] font-medium text-destructive">
                          {errors.affiliationOther}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Conditional: Affiliation === "College" */}
                  {formData.affiliation === "College" && (
                    <div className="space-y-4 sm:col-span-2 p-4 rounded-xl bg-muted/25 border border-border">
                      {/* College Dropdown */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="spot-college"
                          className="text-xs font-semibold text-foreground flex items-center gap-1"
                        >
                          College <span className="text-destructive">*</span>
                        </label>
                        <select
                          id="spot-college"
                          value={formData.college}
                          onChange={(e) => handleInputChange("college", e.target.value)}
                          className={cn(
                            "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                            errors.college ? "border-destructive focus:ring-destructive/30" : "border-border"
                          )}
                        >
                          <option value="">Select College</option>
                          {COLLEGE_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {errors.college && (
                          <p className="text-[11px] font-medium text-destructive">{errors.college}</p>
                        )}
                      </div>

                      {/* If College === "Other", specify college */}
                      {formData.college === "Other" && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-primary/40">
                          <label
                            htmlFor="spot-collegeOther"
                            className="text-xs font-semibold text-foreground flex items-center gap-1"
                          >
                            Please specify the college <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="spot-collegeOther"
                            type="text"
                            placeholder="e.g. M A College"
                            value={formData.collegeOther}
                            onChange={(e) => handleInputChange("collegeOther", e.target.value)}
                            className={cn(
                              "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                              errors.collegeOther
                                ? "border-destructive focus:ring-destructive/30"
                                : "border-border"
                            )}
                          />
                          {errors.collegeOther && (
                            <p className="text-[11px] font-medium text-destructive">
                              {errors.collegeOther}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Year of Study - appears only after college is chosen */}
                      {formData.college && (
                        <div className="space-y-1.5">
                          <label
                            htmlFor="spot-yearOfStudy"
                            className="text-xs font-semibold text-foreground flex items-center gap-1"
                          >
                            Year of Study <span className="text-destructive">*</span>
                          </label>
                          <select
                            id="spot-yearOfStudy"
                            value={formData.yearOfStudy}
                            onChange={(e) => handleInputChange("yearOfStudy", e.target.value)}
                            className={cn(
                              "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                              errors.yearOfStudy
                                ? "border-destructive focus:ring-destructive/30"
                                : "border-border"
                            )}
                          >
                            <option value="">Select Year of Study</option>
                            {YEAR_OF_STUDY_OPTIONS.map((y) => (
                              <option key={y.value} value={y.value}>
                                {y.display}
                              </option>
                            ))}
                          </select>
                          {errors.yearOfStudy && (
                            <p className="text-[11px] font-medium text-destructive">
                              {errors.yearOfStudy}
                            </p>
                          )}
                        </div>
                      )}

                      {/* If Year of Study === "Other", specify year */}
                      {formData.yearOfStudy === "Other" && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-primary/40">
                          <label
                            htmlFor="spot-yearOfStudyOther"
                            className="text-xs font-semibold text-foreground flex items-center gap-1"
                          >
                            Please specify <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="spot-yearOfStudyOther"
                            type="text"
                            placeholder="e.g. Diploma 2nd Year"
                            value={formData.yearOfStudyOther}
                            onChange={(e) => handleInputChange("yearOfStudyOther", e.target.value)}
                            className={cn(
                              "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                              errors.yearOfStudyOther
                                ? "border-destructive focus:ring-destructive/30"
                                : "border-border"
                            )}
                          />
                          {errors.yearOfStudyOther && (
                            <p className="text-[11px] font-medium text-destructive">
                              {errors.yearOfStudyOther}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conditional: Affiliation === "Institutes" */}
                  {formData.affiliation === "Institutes" && (
                    <div className="space-y-4 sm:col-span-2 p-4 rounded-xl bg-muted/25 border border-border">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="spot-institute"
                          className="text-xs font-semibold text-foreground flex items-center gap-1"
                        >
                          Institute <span className="text-destructive">*</span>
                        </label>
                        <select
                          id="spot-institute"
                          value={formData.institute}
                          onChange={(e) => handleInputChange("institute", e.target.value)}
                          className={cn(
                            "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                            errors.institute
                              ? "border-destructive focus:ring-destructive/30"
                              : "border-border"
                          )}
                        >
                          <option value="">Select Institute</option>
                          {INSTITUTE_OPTIONS.map((inst) => (
                            <option key={inst} value={inst}>
                              {inst}
                            </option>
                          ))}
                        </select>
                        {errors.institute && (
                          <p className="text-[11px] font-medium text-destructive">{errors.institute}</p>
                        )}
                      </div>

                      {/* If Institute === "Other", specify */}
                      {formData.institute === "Other" && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-primary/40">
                          <label
                            htmlFor="spot-instituteOther"
                            className="text-xs font-semibold text-foreground flex items-center gap-1"
                          >
                            Please specify the institute <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="spot-instituteOther"
                            type="text"
                            placeholder="e.g. OET Training Center"
                            value={formData.instituteOther}
                            onChange={(e) => handleInputChange("instituteOther", e.target.value)}
                            className={cn(
                              "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                              errors.instituteOther
                                ? "border-destructive focus:ring-destructive/30"
                                : "border-border"
                            )}
                          />
                          {errors.instituteOther && (
                            <p className="text-[11px] font-medium text-destructive">
                              {errors.instituteOther}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2 — Additional Info */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                    2
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    Additional Info
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Parish */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="spot-parish"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Parish Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="spot-parish"
                      type="text"
                      placeholder="St. Mary's Church"
                      value={formData.parish}
                      onChange={(e) => handleInputChange("parish", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.parish ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    />
                    {errors.parish && (
                      <p className="text-[11px] font-medium text-destructive">{errors.parish}</p>
                    )}
                  </div>

                  {/* Diocese */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="spot-diocese"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Diocese Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="spot-diocese"
                      type="text"
                      placeholder="Pala"
                      value={formData.diocese}
                      onChange={(e) => handleInputChange("diocese", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                        errors.diocese ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    />
                    {errors.diocese && (
                      <p className="text-[11px] font-medium text-destructive">{errors.diocese}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="spot-address"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      Address <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="spot-address"
                      rows={2}
                      placeholder="House Name, Street, City"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      className={cn(
                        "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none",
                        errors.address ? "border-destructive focus:ring-destructive/30" : "border-border"
                      )}
                    />
                    {errors.address && (
                      <p className="text-[11px] font-medium text-destructive">{errors.address}</p>
                    )}
                  </div>

                  {/* Confirmed checkbox */}
                  <div className="sm:col-span-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.confirmed}
                        onChange={(e) => handleInputChange("confirmed", e.target.checked)}
                        className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-foreground/90 leading-tight">
                        I confirm that the participant&apos;s details provided above have been verified at the desk.
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
              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Standard Registration Fee</h4>
                  <p className="text-xs text-muted-foreground">Orah Campus Meet 2026</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-foreground tabular-nums">₹600</span>
                  <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                    Per Attendee
                  </span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Payment Method
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

              {/* Dynamic UPI QR Code (When UPI is selected) */}
              {paymentData.method === "UPI" && (
                <PaymentQrCode
                  amount={paymentData.amountPaid > 0 ? paymentData.amountPaid : 600}
                  note={`${formData.name.slice(0, 15)} Spot Reg`}
                />
              )}

              {/* Payment Status Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Status
                  </label>
                  <span className="text-xs font-medium text-foreground">
                    Due: <strong className="tabular-nums">₹{paymentData.amountDue}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange("paid")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      paymentData.status === "paid"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    )}
                  >
                    ✓ Paid (₹600)
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange("partially_paid")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      paymentData.status === "partially_paid"
                        ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30"
                        : "border-border bg-background hover:bg-muted/40 text-foreground"
                    )}
                  >
                    Partial Payment
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange("later_pay")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      paymentData.status === "later_pay"
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30"
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
                        ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30"
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
                      htmlFor="spot-partial-amount"
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
                      id="spot-partial-amount"
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
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-background hover:bg-muted cursor-pointer"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Notes */}
              <div className="space-y-1.5">
                <label
                  htmlFor="spot-payment-note"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
                  <span>Payment / Failure / Audit Notes</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <textarea
                  id="spot-payment-note"
                  rows={2}
                  placeholder="e.g. Cash handed to desk volunteer, UPI Ref #98765432, or promise to clear tomorrow"
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
                  Participant has been registered with type <strong>SPOT</strong>, verified, and checked in to the event.
                </p>
              </div>

              {/* Attendee Summary Card */}
              {createdParticipant && (
                <div className="w-full max-w-md p-4 rounded-2xl border border-border bg-muted/20 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-bold text-foreground text-sm">
                      {createdParticipant.name}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      ✓ Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Phone</span>
                      <span className="font-mono font-medium text-foreground">
                        {createdParticipant.phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Email</span>
                      <span className="font-medium text-foreground truncate block">
                        {createdParticipant.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Parish / Diocese</span>
                      <span className="font-medium text-foreground">
                        {createdParticipant.parish}, {createdParticipant.diocese}
                      </span>
                    </div>
                    <div>
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
                  + Register Another Participant
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
                  form="spot-form"
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
