"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export interface UpiAccount {
  id: "person1" | "person2";
  label: string;
  upiId: string;
  payeeName: string;
  bank: string;
  isPrimary: boolean;
}

export const UPI_ACCOUNTS: UpiAccount[] = [
  {
    id: "person1",
    label: "Person 1 (SBI)",
    upiId: "sebinjosaji-1@oksbi",
    payeeName: "Sebin",
    bank: "SBI",
    isPrimary: true,
  },
  {
    id: "person2",
    label: "Person 2 (YBL)",
    upiId: "8594083822@ybl",
    payeeName: "ANGELIN RONY",
    bank: "YBL",
    isPrimary: false,
  },
];

interface PaymentQrCodeProps {
  amount: number;
  upiId?: string;
  payeeName?: string;
  note?: string;
  className?: string;
  onAccountChange?: (account: UpiAccount) => void;
}

export function PaymentQrCode({
  amount,
  upiId: customUpiId,
  payeeName: customPayeeName,
  note = "Registration Fee - Orah 2026",
  className,
  onAccountChange,
}: PaymentQrCodeProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<"person1" | "person2">("person1");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Active account selection
  const activeAccount =
    UPI_ACCOUNTS.find((a) => a.id === selectedAccountId) || UPI_ACCOUNTS[0];

  const effectiveUpiId = customUpiId || activeAccount.upiId;
  const effectivePayeeName = customPayeeName || activeAccount.payeeName;

  // Construct standard UPI payment URI
  const upiUri = `upi://pay?pa=${effectiveUpiId}&pn=${encodeURIComponent(
    effectivePayeeName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error("Error generating QR code:", err));

    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  const handleAccountChange = (id: "person1" | "person2") => {
    setSelectedAccountId(id);
    const acc = UPI_ACCOUNTS.find((a) => a.id === id);
    if (acc && onAccountChange) {
      onAccountChange(acc);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(effectiveUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border text-center space-y-3",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <svg className="size-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01" />
          </svg>
          UPI Instant Pay
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          ₹{amount}
        </span>
      </div>

      {/* UPI Account Selector Dropdown */}
      <div className="w-full space-y-1.5 text-left bg-background/60 p-2.5 rounded-xl border border-border/70">
        <div className="flex items-center justify-between">
          <label htmlFor="upi-account-select" className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
            <span>Receiving Account</span>
            {activeAccount.isPrimary ? (
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Primary
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Secondary Backup
              </span>
            )}
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {activeAccount.bank}
          </span>
        </div>

        <select
          id="upi-account-select"
          value={selectedAccountId}
          onChange={(e) => handleAccountChange(e.target.value as "person1" | "person2")}
          className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {UPI_ACCOUNTS.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.label} {acc.isPrimary ? "(Primary)" : "(Secondary)"}
            </option>
          ))}
        </select>

        {!activeAccount.isPrimary && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5 flex items-center gap-1">
            <span>Secondary UPI active — use if Person 1 (SBI) fails or hits limit.</span>
          </p>
        )}
      </div>

      {/* QR Code Container */}
      <div className="relative p-2.5 bg-white rounded-xl shadow-md border border-neutral-200 transition-all">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`${activeAccount.label} UPI QR Code`}
            className="size-44 rounded-lg object-contain"
          />
        ) : (
          <div className="size-44 flex items-center justify-center bg-neutral-50 rounded-lg">
            <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
          </div>
        )}
      </div>

      {/* Instructions & Active UPI ID */}
      <div className="space-y-1.5 w-full">
        <p className="text-xs text-muted-foreground">
          Scan with GPay, PhonePe, Paytm, or any UPI app
        </p>

        <div className="flex items-center justify-center gap-1.5 text-xs bg-muted/40 py-1 px-2.5 rounded-lg border border-border/50">
          <span className="font-mono text-muted-foreground text-[11px]">UPI ID:</span>
          <span className="font-mono font-medium text-foreground text-xs select-all">
            {effectiveUpiId}
          </span>
          <button
            type="button"
            onClick={handleCopyUpi}
            className="ml-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
