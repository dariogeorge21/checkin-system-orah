"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UnifiedAttendee, RecentCheckinItem } from "@/components/checkin/checkin-types";
import { CheckinModal } from "@/components/checkin/checkin-modal";
import { SpotRegistrationModal } from "@/components/participants/spot-registration-modal";
import { VolunteerSpotRegistrationModal } from "@/components/volunteers/volunteer-spot-registration-modal";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface FastCheckinStationProps {
  onRefreshStats?: () => void;
}

export function FastCheckinStation({ onRefreshStats }: FastCheckinStationProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "participants" | "volunteers" | "verified">("pending");
  const [results, setResults] = useState<UnifiedAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Recent Check-ins
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckinItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Selected Attendee for CheckinModal
  const [selectedAttendee, setSelectedAttendee] = useState<UnifiedAttendee | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  // Spot Modals
  const [isSpotParticipantModalOpen, setIsSpotParticipantModalOpen] = useState(false);
  const [isSpotVolunteerModalOpen, setIsSpotVolunteerModalOpen] = useState(false);

  // Fetch search results
  const fetchSearchResults = useCallback(async (q: string, f: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/checkin/search?q=${encodeURIComponent(q.trim())}&filter=${f}&limit=30`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  // Fetch recent check-ins
  const fetchRecentCheckins = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch("/api/checkin/recent");
      if (res.ok) {
        const data = await res.json();
        setRecentCheckins(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching recent checkins:", err);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  // Debounced search on query or filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearchResults(query, filter);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, filter, fetchSearchResults]);

  // Initial recent check-ins load
  useEffect(() => {
    fetchRecentCheckins();
  }, [fetchRecentCheckins]);

  // Callback when a checkin completes
  const handleCheckinSuccess = () => {
    fetchSearchResults(query, filter);
    fetchRecentCheckins();
    if (onRefreshStats) onRefreshStats();
  };

  const handleOpenCheckin = (attendee: UnifiedAttendee) => {
    setSelectedAttendee(attendee);
    setIsCheckinModalOpen(true);
  };

  return (
    <section className="space-y-6">
      {/* Front Desk Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-sm">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-64 rounded-full bg-[oklch(0.55_0.22_270)]/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                Front Desk Check-in Station
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Instant search for online & offline attendees. 1-click ₹600 fee collection & check-in.
            </p>
          </div>

          {/* Quick Spot Registration Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-spot-participant"
              onClick={() => setIsSpotParticipantModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              + Spot Participant
            </button>

            <button
              id="btn-spot-volunteer"
              onClick={() => setIsSpotVolunteerModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer"
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              + Spot Volunteer
            </button>
          </div>
        </div>

        {/* Large Prominent Search Input */}
        <div className="mt-5 space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>

            <input
              id="fast-checkin-search"
              type="search"
              placeholder="Search by Phone number (e.g. 9847...), Name, Email, or Parish…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border-2 border-border/80 bg-background/90 pl-11 pr-24 py-3.5 text-base font-medium text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-[oklch(0.55_0.22_270)] focus:ring-4 focus:ring-[oklch(0.55_0.22_270)]/15 shadow-sm transition-all"
            />

            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {loading && <Spinner className="size-4 text-muted-foreground" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                >
                  ✕
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                Ctrl+K
              </kbd>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "pending", label: "Pending Check-in", count: undefined },
                { id: "all", label: "All Attendees", count: undefined },
                { id: "participants", label: "Participants", count: undefined },
                { id: "volunteers", label: "Volunteers", count: undefined },
                { id: "verified", label: "Checked In", count: undefined },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id as any)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    filter === chip.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Search Results & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Search Results Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {query.trim()
                ? `Results for "${query}"`
                : filter === "pending"
                ? "Pending Attendees Awaiting Check-in"
                : "Attendee Directory"}
            </h4>
            {loading && <span className="text-xs text-muted-foreground animate-pulse">Searching…</span>}
          </div>

          {initialLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3 bg-muted/10">
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
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
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {query ? `No matching attendees found for "${query}"` : "No attendees in this category."}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Check the spelling, search by 10-digit mobile number, or perform a spot registration.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.map((item) => (
                <div
                  key={`${item.personType}-${item.id}`}
                  className={cn(
                    "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all duration-150 shadow-xs",
                    item.isCheckedIn
                      ? "border-border bg-muted/15 hover:bg-muted/30"
                      : "border-border/90 bg-background hover:border-primary/40 hover:shadow-md"
                  )}
                >
                  {/* Attendee Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-inner mt-0.5",
                        item.personType === "participant"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                      )}
                    >
                      {item.personType === "participant" ? "PART" : "VOL"}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">
                          {item.name}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                            item.registrationType === "ONLINE"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                          )}
                        >
                          {item.registrationType}
                        </span>

                        {item.role && item.role !== "member" && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {item.role}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono font-medium text-foreground">
                          {item.phone}
                        </span>
                        {item.email && <span className="truncate">{item.email}</span>}
                        {(item.parish || item.ministry) && (
                          <span className="truncate">📍 {item.parish || item.ministry}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Area */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                    {item.isCheckedIn ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            ✓ Checked In
                          </span>
                          <span className="block text-[10px] text-muted-foreground mt-0.5 font-medium">
                            {item.checkin?.payment_method || "Paid"} • ₹{item.checkin?.amount_paid ?? 600}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenCheckin(item)}
                          className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          title="View / Edit Check-in"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCheckin(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
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
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Check In & Fee (₹600)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Desk Feed Column (1 Col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Desk Activity
              </h4>
            </div>

            <button
              onClick={fetchRecentCheckins}
              disabled={recentLoading}
              className="text-[11px] text-primary hover:underline cursor-pointer disabled:opacity-50"
            >
              {recentLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
            {recentCheckins.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No check-ins recorded yet during this session.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentCheckins.map((item) => (
                  <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        ₹{item.amountPaid}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">
                        {item.personType === "volunteer" ? "Volunteer" : "Participant"} •{" "}
                        {item.paymentMethod || "UPI"}
                      </span>
                      <span className="text-[10px] tabular-nums">
                        {new Date(item.checkedInAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CheckinModal
        attendee={selectedAttendee}
        open={isCheckinModalOpen}
        onOpenChange={setIsCheckinModalOpen}
        onSuccess={handleCheckinSuccess}
      />

      <SpotRegistrationModal
        open={isSpotParticipantModalOpen}
        onOpenChange={setIsSpotParticipantModalOpen}
        onSuccess={handleCheckinSuccess}
      />

      <VolunteerSpotRegistrationModal
        open={isSpotVolunteerModalOpen}
        onOpenChange={setIsSpotVolunteerModalOpen}
        onSuccess={handleCheckinSuccess}
      />
    </section>
  );
}
