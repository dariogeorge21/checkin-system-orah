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
  ResourceFormData,
  INITIAL_RESOURCE_FORM_DATA,
  sanitizeInput,
  validateResourceForm,
} from "./resource-registration-types";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface ResourceRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResourceRegistrationModal({
  open,
  onOpenChange,
  onSuccess,
}: ResourceRegistrationModalProps) {
  const [formData, setFormData] = useState<ResourceFormData>(INITIAL_RESOURCE_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleInputChange = (
    field: keyof ResourceFormData,
    rawValue: string | boolean
  ) => {
    let cleanValue: string | boolean;
    if (typeof rawValue === "string") {
      cleanValue = sanitizeInput(rawValue);
    } else {
      cleanValue = rawValue;
    }

    setFormData((prev) => ({ ...prev, [field]: cleanValue }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate
    const validationErrors = validateResourceForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register resource person.");
      }

      setSuccessData(data.resource);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Resource registration error:", err);
      setSubmitError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_RESOURCE_FORM_DATA);
    setErrors({});
    setSubmitError(null);
    setSuccessData(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      handleReset();
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl sm:rounded-3xl"
        aria-describedby="resource-registration-desc"
      >
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg font-bold text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  RES
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Resource Registration
                </DialogTitle>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                No Fee Collection
              </span>
            </div>
            <DialogDescription id="resource-registration-desc" className="text-xs text-muted-foreground mt-1">
              On-spot registration for speakers, animators, and guests. Exempt from registration fee.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {successData ? (
            /* Success View */
            <div className="space-y-6 py-2 text-center">
              <div className="mx-auto size-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg
                  width="28"
                  height="28"
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
                <h3 className="text-lg font-bold text-foreground">
                  Resource Registered Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {successData.is_checked_in
                    ? "Checked in and recorded with No Fee Collection."
                    : "Registration recorded successfully."}
                </p>
              </div>

              {/* Summary Card */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Name</span>
                  <span className="font-bold text-foreground text-sm">{successData.name}</span>
                </div>
                {successData.phone && (
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Phone</span>
                    <span className="font-mono text-foreground">{successData.phone}</span>
                  </div>
                )}
                {successData.from_location && (
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">From</span>
                    <span className="font-medium text-foreground">{successData.from_location}</span>
                  </div>
                )}
                {successData.session && (
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Session</span>
                    <span className="font-semibold text-primary">{successData.session}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Registration Type</span>
                  <span className="font-bold text-violet-600 dark:text-violet-400">On-Spot</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Fee Collection</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹0 (Exempt / Free)
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  + Register Another Resource
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form id="resource-registration-form" onSubmit={handleSubmit} className="space-y-4">
              {/* No Fee Banner */}
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="text-base mt-0.5 shrink-0">⭐</span>
                <div>
                  <strong className="font-bold">No Fee Collection:</strong> Resource persons are
                  guests, speakers, or animators and are 100% exempt from registration fees. No
                  payment or QR code is required.
                </div>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {submitError}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="resource-name"
                  className="text-xs font-bold text-foreground flex items-center justify-between"
                >
                  <span>
                    Full Name <span className="text-destructive">*</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">Required</span>
                </label>
                <input
                  id="resource-name"
                  type="text"
                  placeholder="e.g. Fr. Augustine / Dr. Mathew Joseph"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all",
                    errors.name ? "border-destructive focus:border-destructive" : "border-border"
                  )}
                  autoFocus
                />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
              </div>

              {/* Phone Number (Optional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="resource-phone"
                  className="text-xs font-bold text-foreground flex items-center justify-between"
                >
                  <span>Phone Number</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <input
                  id="resource-phone"
                  type="tel"
                  placeholder="e.g. 9847123456"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all",
                    errors.phone ? "border-destructive focus:border-destructive" : "border-border"
                  )}
                />
                {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
              </div>

              {/* From (Optional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="resource-from"
                  className="text-xs font-bold text-foreground flex items-center justify-between"
                >
                  <span>From (Institution / Parish / Location)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <input
                  id="resource-from"
                  type="text"
                  placeholder="e.g. Sacred Heart College / St. Thomas Parish / Pala"
                  value={formData.fromLocation}
                  onChange={(e) => handleInputChange("fromLocation", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all",
                    errors.fromLocation ? "border-destructive focus:border-destructive" : "border-border"
                  )}
                />
                {errors.fromLocation && (
                  <p className="text-[11px] text-destructive">{errors.fromLocation}</p>
                )}
              </div>

              {/* Session (Optional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="resource-session"
                  className="text-xs font-bold text-foreground flex items-center justify-between"
                >
                  <span>Session / Topic</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <input
                  id="resource-session"
                  type="text"
                  placeholder="e.g. Keynote: Discipleship in Action / Workshop 1"
                  value={formData.session}
                  onChange={(e) => handleInputChange("session", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all",
                    errors.session ? "border-destructive focus:border-destructive" : "border-border"
                  )}
                />
                {errors.session && <p className="text-[11px] text-destructive">{errors.session}</p>}
              </div>

              {/* Notes (Optional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="resource-notes"
                  className="text-xs font-bold text-foreground flex items-center justify-between"
                >
                  <span>Additional Notes</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <input
                  id="resource-notes"
                  type="text"
                  placeholder="e.g. Needs wireless mic, arriving before lunch"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/30 transition-all",
                    errors.notes ? "border-destructive focus:border-destructive" : "border-border"
                  )}
                />
              </div>

              {/* Auto Check-in Toggle */}
              <div className="pt-2 border-t border-border">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="resource-auto-checkin"
                    checked={formData.isCheckedIn}
                    onChange={(e) => handleInputChange("isCheckedIn", e.target.checked)}
                    className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">
                      Check in immediately upon registration
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Marks the resource person as present at the desk (Recommended for on-spot arrival).
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Spinner className="size-3.5" />
                      Registering…
                    </>
                  ) : (
                    <>
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
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Complete Registration
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

