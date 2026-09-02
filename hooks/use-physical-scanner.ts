"use client";

import { useEffect, useRef } from "react";

interface UsePhysicalScannerOptions {
  onScan: (scannedCode: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Hook to capture input from physical USB / Bluetooth barcode & QR code scanners.
 * Hardware scanners act as high-speed keyboard input terminating with an 'Enter' key.
 */
export function usePhysicalScanner({
  onScan,
  enabled = true,
  minChars = 4,
  maxIntervalMs = 50,
}: UsePhysicalScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Ignore modifier keys
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }

      // Check if user is typing in a standard editable input
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Handle Enter (end of barcode scan)
      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";

        if (code.length >= minChars) {
          // Prevent form submit if it was a physical scanner burst
          if (!isInputFocused || interval < maxIntervalMs * 3) {
            e.preventDefault();
            e.stopPropagation();
          }
          onScanRef.current(code);
        }
        return;
      }

      // If key is a printable character
      if (e.key.length === 1) {
        // If the interval between keystrokes is too long, reset the buffer (human typing)
        if (bufferRef.current.length > 0 && interval > maxIntervalMs * 4) {
          bufferRef.current = "";
        }

        bufferRef.current += e.key;

        // Auto-clear buffer after 500ms of inactivity
        setTimeout(() => {
          if (Date.now() - lastKeyTimeRef.current > 400) {
            bufferRef.current = "";
          }
        }, 450);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs]);
}
