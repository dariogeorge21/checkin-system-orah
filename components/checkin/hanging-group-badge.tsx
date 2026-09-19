"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface HangingGroupBadgeProps {
  groupNumber: number | null;
  loading?: boolean;
  isAssigned?: boolean;
  className?: string;
}

/**
 * Hanging Lanyard Badge component displayed on check-in modals for Participants.
 * Visually appears as an authentic event badge hanging from the top edge of the modal.
 */
export function HangingGroupBadge({
  groupNumber,
  loading = false,
  isAssigned = false,
  className,
}: HangingGroupBadgeProps) {
  if (groupNumber === null && !loading) return null;

  const displayNum = groupNumber !== null
    ? groupNumber < 10
      ? `0${groupNumber}`
      : `${groupNumber}`
    : "--";

  return (
    <div
      className={cn(
        "absolute top-0 right-14 sm:right-18 z-30 flex flex-col items-center pointer-events-none select-none drop-shadow-xl animate-in fade-in slide-in-from-top-6 duration-300 origin-top",
        className
      )}
      aria-label={`Assigned Group Number: ${groupNumber ?? "Calculating"}`}
    >
      {/* 1. Lanyard Ribbon Strap */}
      <div className="w-6 sm:w-7 h-3 bg-gradient-to-b from-primary via-primary/90 to-primary/80 shadow-inner flex items-center justify-center">
        {/* Subtle ribbon weave lines */}
        <div className="w-full h-px bg-white/20" />
      </div>

      {/* 2. Metallic Clasp / Clip */}
      <div className="w-8 sm:w-9 h-2 bg-gradient-to-b from-neutral-300 via-neutral-200 to-neutral-400 dark:from-neutral-600 dark:via-neutral-500 dark:to-neutral-700 rounded-xs border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center">
        <div className="w-3 h-0.5 bg-black/30 dark:bg-white/30 rounded-full" />
      </div>

      {/* 3. Badge Card Container */}
      <div className="relative mt-0.5 flex flex-col items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-card/95 backdrop-blur-md border-2 border-primary/40 rounded-b-2xl rounded-t-sm shadow-2xl ring-4 ring-primary/10 min-w-[88px] sm:min-w-[100px] text-center">
        {/* Punch-hole cutout at top of card */}
        <div className="w-3.5 h-1 rounded-full bg-muted/90 border border-border/80 mb-1" />

        {/* Small Top Label */}
        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-primary flex items-center gap-1">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          GROUP
        </span>

        {/* Big Bold Group Number (1-15) */}
        {loading ? (
          <div className="h-8 flex items-center justify-center">
            <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex items-baseline justify-center">
            <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight leading-none my-0.5">
              {displayNum}
            </span>
          </div>
        )}

        {/* Status / Subtitle Pill */}
        <span
          className={cn(
            "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full mt-0.5",
            isAssigned
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
          )}
        >
          {isAssigned ? "✓ Confirmed" : "Preview"}
        </span>
      </div>
    </div>
  );
}
