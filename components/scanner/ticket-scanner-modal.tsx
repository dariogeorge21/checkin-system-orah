"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CameraQrScanner } from "./camera-qr-scanner";
import { usePhysicalScanner } from "@/hooks/use-physical-scanner";
import { CheckinModal } from "@/components/checkin/checkin-modal";
import { UnifiedAttendee } from "@/components/checkin/checkin-types";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface TicketScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckinSuccess?: () => void;
}

export function TicketScannerModal({
  open,
  onOpenChange,
  onCheckinSuccess,
}: TicketScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Selected attendee for CheckinModal
  const [scannedAttendee, setScannedAttendee] = useState<UnifiedAttendee | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  // Recent scans in this modal session
  const [sessionScans, setSessionScans] = useState<
    { code: string; name: string; time: string; success: boolean }[]
  >([]);

  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // Main lookup function
  const handleProcessCode = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode || isSearching) return;

      setIsSearching(true);
      setScanError(null);
      setLastScannedCode(cleanCode);

      try {
        const res = await fetch("/api/tickets/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCode: cleanCode }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const errorMsg = data.error || `No participant found for ticket "${cleanCode}".`;
          setScanError(errorMsg);
          setSessionScans((prev) => [
            {
              code: cleanCode,
              name: "Not Found / Error",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              success: false,
            },
            ...prev.slice(0, 9),
          ]);
          return;
        }

        const participant: UnifiedAttendee = {
          ...data.participant,
          ticketId: data.ticket?.id || cleanCode,
          ticket: data.ticket || null,
        };

        setSessionScans((prev) => [
          {
            code: cleanCode,
            name: participant.name,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            success: true,
          },
          ...prev.slice(0, 9),
        ]);

        // Open Checkin Modal for this attendee
        setScannedAttendee(participant);
        setIsCheckinModalOpen(true);
        // Temporarily close scanner modal so CheckinModal takes foreground cleanly
        onOpenChange(false);
      } catch (err: any) {
        console.error("Error processing ticket code:", err);
        setScanError(err?.message || "Failed to lookup ticket. Please check connection.");
      } finally {
        setIsSearching(false);
      }
    },
    [isSearching, onOpenChange]
  );

  // Activate Physical Scanner listener when modal is open
  usePhysicalScanner({
    enabled: open && !isCheckinModalOpen,
    onScan: (code) => {
      handleProcessCode(code);
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleProcessCode(manualCode.trim());
      setManualCode("");
    }
  };

  // Re-open scanner when user clicks "Scan Next Ticket" on CheckinModal
  const handleScanNext = () => {
    setScannedAttendee(null);
    setScanError(null);
    setIsCheckinModalOpen(false);
    onOpenChange(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl sm:rounded-3xl gap-0"
          aria-describedby="ticket-scanner-desc"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border bg-muted/20">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
                    <svg
                      width="18"
                      height="18"
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
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                      Scan Participant Ticket QR
                    </DialogTitle>
                    <DialogDescription id="ticket-scanner-desc" className="text-xs text-muted-foreground">
                      Camera Front/Back scanner + Physical barcode gun support. Exclusive for Participants.
                    </DialogDescription>
                  </div>
                </div>

                {/* Mode Selector Pill */}
                <div className="flex items-center rounded-xl bg-muted p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab("camera")}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      activeTab === "camera"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("manual");
                      setTimeout(() => manualInputRef.current?.focus(), 100);
                    }}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      activeTab === "manual"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Manual / Gun
                  </button>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Scanner Viewport / Content */}
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Error Notification */}
            {scanError && (
              <div className="p-3.5 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start justify-between gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{scanError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScanError(null)}
                  className="font-bold text-destructive hover:opacity-75 cursor-pointer ml-auto shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Searching Overlay Banner */}
            {isSearching && (
              <div className="p-3 rounded-2xl border border-primary/30 bg-primary/10 text-primary text-xs flex items-center justify-center gap-2 font-medium animate-pulse">
                <Spinner className="size-4" />
                <span>Looking up participant for ticket #{lastScannedCode?.slice(0, 12)}…</span>
              </div>
            )}

            {/* Camera View */}
            {activeTab === "camera" && (
              <div className="space-y-3">
                <CameraQrScanner
                  active={open && !isCheckinModalOpen && !isSearching}
                  onScan={(code) => handleProcessCode(code)}
                />
                <p className="text-center text-[11px] text-muted-foreground">
                  Point camera at the QR code on the participant&apos;s ticket. Auto-focuses & verifies immediately.
                </p>
              </div>
            )}

            {/* Manual & Hardware Scanner Input View */}
            {activeTab === "manual" && (
              <div className="space-y-4 py-2">
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <label
                    htmlFor="manual-ticket-id"
                    className="text-xs font-semibold text-foreground uppercase tracking-wider block"
                  >
                    Enter Ticket ID or Pull Barcode Gun Trigger
                  </label>

                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-muted-foreground">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="18" height="12" x="3" y="6" rx="2" />
                        <line x1="7" y1="10" x2="7" y2="14" />
                        <line x1="11" y1="10" x2="11" y2="14" />
                        <line x1="15" y1="10" x2="15" y2="14" />
                      </svg>
                    </span>

                    <input
                      ref={manualInputRef}
                      id="manual-ticket-id"
                      type="text"
                      placeholder="e.g. b1145777-f2d2-41ea-b206-b4177f89f372"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      disabled={isSearching}
                      autoFocus
                      className="w-full rounded-2xl border-2 border-border bg-background pl-10 pr-24 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
                    />

                    <button
                      type="submit"
                      disabled={!manualCode.trim() || isSearching}
                      className="absolute right-2 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                    >
                      Lookup
                    </button>
                  </div>
                </form>

                {/* Hardware Scanner Tip */}
                <div className="p-3.5 rounded-2xl border border-border bg-muted/30 text-xs text-muted-foreground flex items-start gap-3">
                  <span className="text-base">🔫</span>
                  <div className="space-y-0.5">
                    <strong className="text-foreground block">USB / Bluetooth Scanner Ready:</strong>
                    <span>
                      You can directly scan barcodes with your physical reader. Scanned barcodes will auto-trigger approval.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Session Scans Activity History */}
            {sessionScans.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Recent Scans in this Session
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1.5">
                  {sessionScans.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40 border border-border/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            s.success ? "bg-emerald-500" : "bg-destructive"
                          )}
                        />
                        <span className="font-semibold text-foreground truncate">{s.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                          #{s.code.slice(0, 8)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Press <kbd className="rounded border bg-background px-1 text-[10px]">Ctrl+S</kbd> anytime to open scanner
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded CheckinModal for Scanned Attendee */}
      <CheckinModal
        attendee={scannedAttendee}
        open={isCheckinModalOpen}
        onOpenChange={(isOpen) => {
          setIsCheckinModalOpen(isOpen);
          if (!isOpen && !scannedAttendee) {
            // Re-open scanner if closed without check-in
          }
        }}
        onSuccess={() => {
          if (onCheckinSuccess) onCheckinSuccess();
        }}
        onScanNext={handleScanNext}
      />
    </>
  );
}
