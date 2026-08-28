"use client";

import React, { useState, useActionState } from "react";
import { useTheme } from "next-themes";
import { loginAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-9" />;

  return (
    <button
      id="theme-toggle"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex items-center justify-center size-9 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        // Sun icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}

const initialState: { error: string } = { error: "" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string }, formData: FormData): Promise<{ error: string }> => {
      const result = await loginAction(formData);
      return result ?? { error: "" };
    },
    initialState
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[oklch(0.10_0.02_265)]">
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[oklch(0.50_0.22_270)] opacity-[0.08] blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-[oklch(0.60_0.20_230)] opacity-[0.07] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[oklch(0.45_0.18_280)] opacity-[0.05] blur-[140px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Theme toggle — top right */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Glass card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6)] p-8">
          {/* Logo / Brand */}
          <div className="mb-8 text-center">
            {/* Cross icon */}
            <div className="mx-auto mb-4 inline-flex items-center justify-center size-14 rounded-2xl bg-[oklch(0.55_0.22_270)] shadow-[0_0_40px_-4px_oklch(0.55_0.22_270)]">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden="true"
              >
                <path d="M12 2C11.45 2 11 2.45 11 3V10H4C3.45 10 3 10.45 3 11V13C3 13.55 3.45 14 4 14H11V21C11 21.55 11.45 22 12 22C12.55 22 13 21.55 13 21V14H20C20.55 14 21 13.55 21 13V11C21 10.45 20.55 10 20 10H13V3C13 2.45 12.55 2 12 2Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Orah
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Campus Meet 2026 · Check-in Portal
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-white/60 uppercase tracking-widest"
              >
                Email
              </Label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="volunteer@example.com"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none ring-0 transition-all duration-200 focus:border-[oklch(0.55_0.22_270)]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-white/60 uppercase tracking-widest"
              >
                Password
              </Label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none ring-0 transition-all duration-200 focus:border-[oklch(0.55_0.22_270)]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[oklch(0.55_0.22_270)]/20"
              />
            </div>

            {state?.error && (
              <div
                role="alert"
                id="login-error"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
              >
                {state.error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-xl bg-[oklch(0.55_0.22_270)] py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_-6px_oklch(0.55_0.22_270)] transition-all duration-200 hover:bg-[oklch(0.60_0.22_270)] hover:shadow-[0_0_40px_-4px_oklch(0.60_0.22_270)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-white/20">
            Access is restricted to authorised volunteers only.
          </p>
        </div>

        {/* Organisation credit */}
        <p className="mt-5 text-center text-xs text-white/20">
          JY Pala Missionaries
        </p>
      </div>
    </div>
  );
}
