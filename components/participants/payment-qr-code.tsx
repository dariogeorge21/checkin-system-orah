"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

interface PaymentQrCodeProps {
  amount: number;
  upiId?: string;
  payeeName?: string;
  note?: string;
  className?: string;
}

export function PaymentQrCode({
  amount,
  upiId = "7838403506@sbi",
  payeeName = "Dario George",
  note = "Registration Fee - Orah 2026",
  className,
}: PaymentQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Construct standard UPI payment URI
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    payeeName
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

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
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
      <div className="flex items-center justify-between w-full px-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          UPI Instant Pay
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          ₹{amount}
        </span>
      </div>

      {/* QR Code Container */}
      <div className="relative p-2.5 bg-white rounded-xl shadow-md border border-neutral-200">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="UPI Payment QR Code"
            className="size-44 rounded-lg object-contain"
          />
        ) : (
          <div className="size-44 flex items-center justify-center bg-neutral-50 rounded-lg">
            <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
          </div>
        )}
      </div>

      {/* Instructions & UPI ID */}
      <div className="space-y-1.5 w-full">
        <p className="text-xs text-muted-foreground">
          Scan with GPay, PhonePe, Paytm, or any UPI app
        </p>

        <div className="flex items-center justify-center gap-1.5 text-xs">
          <span className="font-mono text-muted-foreground">UPI ID:</span>
          <span className="font-mono font-medium text-foreground select-all">
            {upiId}
          </span>
          <button
            type="button"
            onClick={handleCopyUpi}
            className="ml-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
