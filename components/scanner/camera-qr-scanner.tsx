"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface CameraQrScannerProps {
  onScan: (code: string) => void;
  active?: boolean;
  className?: string;
}

// Audio beep generator using Web Audio API
function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext blocked or not supported, ignore silently
  }
}

export function CameraQrScanner({
  onScan,
  active = true,
  className,
}: CameraQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);

  // Enumerate cameras
  const getCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
    } catch (err) {
      console.warn("Could not enumerate devices:", err);
    }
  }, []);

  // Initialize or restart camera stream
  const startCamera = useCallback(async () => {
    if (!active) return;
    setLoadingCamera(true);
    setCameraError(null);
    setTorchOn(false);

    // Stop existing stream tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const currentStream = videoRef.current.srcObject as MediaStream;
      currentStream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: facingMode === "environment" ? { ideal: "environment" } : "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for torch capability on the active video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(Boolean(capabilities.torch));
      }

      await getCameraDevices();
      setLoadingCamera(false);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setLoadingCamera(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access in browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError(err.message || "Failed to start camera. Please ensure no other app is using it.");
      }
    }
  }, [active, facingMode, selectedDeviceId, getCameraDevices]);

  // Handle stream lifecycle on mount or config change
  useEffect(() => {
    startCamera();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("Could not toggle torch:", err);
    }
  };

  // Switch between Front & Back cameras
  const toggleFacingMode = () => {
    setSelectedDeviceId(""); // clear exact device id so facingMode takes precedence
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Scan frame processing loop
  useEffect(() => {
    if (!active || loadingCamera || cameraError) return;

    let isScanning = true;

    // Check if modern native BarcodeDetector API is available
    const hasNativeBarcode = "BarcodeDetector" in window;
    const barcodeDetector = hasNativeBarcode
      ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
      : null;

    const processFrame = async () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (videoWidth > 0 && videoHeight > 0) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

            let decodedValue: string | null = null;

            // 1. Try native BarcodeDetector first (faster & hardware accelerated)
            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(canvas);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  decodedValue = barcodes[0].rawValue;
                }
              } catch {
                // Fallback to jsQR
              }
            }

            // 2. Fallback to jsQR
            if (!decodedValue) {
              const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
              const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });
              if (qrResult && qrResult.data) {
                decodedValue = qrResult.data;
              }
            }

            // If a QR is detected
            if (decodedValue && decodedValue.trim()) {
              const now = Date.now();
              // Prevent duplicate scanning burst within 1.5s
              if (now - lastScannedTimeRef.current > 1500) {
                lastScannedTimeRef.current = now;

                // Flash feedback
                setScanSuccessFlash(true);
                setTimeout(() => setScanSuccessFlash(false), 500);

                // Audio beep
                playScanBeep();

                // Haptic feedback
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate([80, 40, 80]);
                }

                // Notify parent
                onScan(decodedValue.trim());
              }
            }
          }
        }
      }

      if (isScanning) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isScanning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active, loadingCamera, cameraError, onScan]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-black border border-border/80 shadow-2xl",
        className
      )}
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Viewport */}
      <div className="relative w-full aspect-square max-h-[380px] sm:max-h-[440px] flex items-center justify-center overflow-hidden bg-neutral-950">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            loadingCamera ? "opacity-0" : "opacity-100",
            facingMode === "user" ? "-scale-x-100" : "" // mirror front camera
          )}
        />

        {/* Loading Spinner */}
        {loadingCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 text-white z-10">
            <Spinner className="size-8 text-primary" />
            <p className="text-xs text-neutral-400 font-medium">Starting camera…</p>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-950/95 text-white z-20 space-y-4">
            <div className="size-12 rounded-2xl bg-destructive/15 text-destructive border border-destructive/30 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <div className="max-w-xs">
              <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
              <p className="text-xs text-neutral-400 mt-1">{cameraError}</p>
            </div>
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Successful Scan Flash Overlay */}
        {scanSuccessFlash && (
          <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center z-30 transition-all animate-pulse">
            <div className="size-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        )}

        {/* Viewfinder Target Reticle */}
        {!loadingCamera && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            {/* Outer dark vignette */}
            <div className="relative size-60 sm:size-72 border-2 border-primary/40 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 size-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 size-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 size-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 size-6 border-b-4 border-r-4 border-primary rounded-br-xl" />

              {/* Animated Laser Scan Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_2px_rgba(99,102,241,0.8)] animate-[scanline_2s_ease-in-out_infinite]" />

              {/* Center subtle crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="size-6 border border-white/60 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      <div className="w-full bg-neutral-900/90 border-t border-neutral-800 px-4 py-3 flex items-center justify-between gap-3 text-white text-xs z-10">
        {/* Camera Selector / Mode indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-neutral-300 font-medium truncate">
            {facingMode === "environment" ? "Back Camera" : "Front Camera"}
          </span>
          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="ml-1 max-w-[140px] bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg px-2 py-1 text-[11px] truncate focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Auto Select</option>
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action buttons (Torch & Flip) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Torch toggle (if supported) */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                torchOn
                  ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                  : "bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700"
              )}
              title="Toggle Flashlight / Torch"
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
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>{torchOn ? "Torch On" : "Torch"}</span>
            </button>
          )}

          {/* Front / Back switch button */}
          <button
            type="button"
            onClick={toggleFacingMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
            title="Switch between Front and Back cameras"
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
              <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.21 1.005 4.185 2.596 5.518" />
              <polyline points="7 10 4 10 4 7" />
              <path d="M4 14c0 4.418 3.582 8 8 8s8-3.582 8-8c0-2.21-1.005-4.185-2.596-5.518" />
              <polyline points="17 14 20 14 20 17" />
            </svg>
            <span>{facingMode === "environment" ? "Front Cam" : "Back Cam"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
