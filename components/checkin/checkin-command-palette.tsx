"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UnifiedAttendee } from "./checkin-types";
import { CheckinModal } from "./checkin-modal";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface CheckinCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckinSuccess?: () => void;
}

export function CheckinCommandPalette({
  open,
  onOpenChange,
  onCheckinSuccess,
}: CheckinCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Selected attendee for CheckinModal
  const [selectedAttendee, setSelectedAttendee] = useState<UnifiedAttendee | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  const searchAttendees = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/checkin/search?q=${encodeURIComponent(q.trim())}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch (err) {
      console.error("Error searching in command palette:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchAttendees(query);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, searchAttendees]);

  // Reset when palette opens/closes
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      if (results[selectedIndex]) {
        e.preventDefault();
        handleSelectAttendee(results[selectedIndex]);
      }
    }
  };

  const handleSelectAttendee = (attendee: UnifiedAttendee) => {
    setSelectedAttendee(attendee);
    setIsCheckinModalOpen(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl sm:rounded-3xl gap-0"
          aria-describedby="palette-desc"
        >
          {/* Accessible Title & Description */}
          <div className="sr-only">
            <DialogTitle>Quick Search and Check-in</DialogTitle>
            <DialogDescription id="palette-desc">
              Search participants and volunteers by phone, name, email, or parish for immediate front-desk check-in.
            </DialogDescription>
          </div>

          {/* Search Header */}
          <div className="relative flex items-center px-4 py-3.5 border-b border-border bg-muted/20">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground mr-3 shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              type="text"
              placeholder="Search by phone, name, email, or parish… (e.g. 9847 or Maria)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />

            {loading ? (
              <Spinner className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-border/50">
            {!query.trim() && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Type an attendee&apos;s phone number, name, or parish to find and check them in instantly.
              </div>
            )}

            {query.trim() && !loading && results.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No matching participants or volunteers found for &quot;{query}&quot;.
              </div>
            )}

            {results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.personType}-${item.id}`}
                  onClick={() => handleSelectAttendee(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-100",
                    isSelected ? "bg-muted text-foreground" : "hover:bg-muted/40 text-foreground/90"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0",
                        item.personType === "participant"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      )}
                    >
                      {item.personType === "participant" ? "P" : "V"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{item.name}</span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                            item.registrationType === "ONLINE"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                          )}
                        >
                          {item.registrationType}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                        <span className="font-mono text-foreground/80">{item.phone}</span>
                        {(item.parish || item.ministry) && (
                          <span>• {item.parish || item.ministry}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground shadow-sm">
                        Check In →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer hints */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="font-sans px-1 rounded bg-muted border border-border">↑</kbd>{" "}
                <kbd className="font-sans px-1 rounded bg-muted border border-border">↓</kbd> Navigate
              </span>
              <span>
                <kbd className="font-sans px-1.5 rounded bg-muted border border-border">↵</kbd> Select & Check In
              </span>
            </div>
            <span>Press ESC to exit</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded CheckinModal */}
      <CheckinModal
        attendee={selectedAttendee}
        open={isCheckinModalOpen}
        onOpenChange={setIsCheckinModalOpen}
        onSuccess={() => {
          if (onCheckinSuccess) onCheckinSuccess();
        }}
      />
    </>
  );
}
