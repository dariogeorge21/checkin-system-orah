"use client";

import React from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { logoutAction } from "@/features/auth/actions";
import type { User } from "@supabase/supabase-js";

import { CheckinCommandPalette } from "@/components/checkin/checkin-command-palette";
import { TicketScannerModal } from "@/components/scanner/ticket-scanner-modal";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Registration overview" },
  "/participants": { title: "Participants", subtitle: "Registration management" },
  "/volunteers": { title: "Volunteers", subtitle: "Volunteer registration" },
};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-8" />;

  return (
    <button
      id="header-theme-toggle"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center size-8 rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 cursor-pointer"
    >
      {resolvedTheme === "dark" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}

export function AppHeader({ user }: { user: User }) {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? { title: "Orah", subtitle: "Campus Meet 2026" };
  const initials = user.email?.slice(0, 2).toUpperCase() ?? "??";
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);

  // Global Ctrl+K (Quick Search) and Ctrl+S (Scan Ticket) listeners
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsScannerOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4">
        {/* Sidebar toggle */}
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" id="sidebar-trigger" />

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Page title */}
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-foreground">{page.title}</span>
          <span className="text-[10px] text-muted-foreground">{page.subtitle}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Global Fast Scan Ticket QR Trigger */}
        <button
          id="header-scan-qr-btn"
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-xs text-primary font-semibold transition-all cursor-pointer shadow-2xs"
          title="Scan participant ticket QR (Ctrl+S)"
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
            <rect width="14" height="14" x="5" y="5" rx="2" />
            <path d="M9 9h6v6H9z" />
          </svg>
          <span>Scan Ticket</span>
          <kbd className="hidden md:inline rounded border border-primary/30 bg-primary/10 px-1 py-0.2 text-[9px] font-mono text-primary font-bold">
            Ctrl S
          </kbd>
        </button>

        {/* Global Fast Search / Check-in Trigger */}
        <button
          id="header-fast-search-btn"
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground transition-all cursor-pointer shadow-2xs"
          title="Search attendee (Ctrl+K)"
        >
          <svg
            width="13"
            height="13"
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
          <span className="hidden md:inline font-medium text-foreground/80">
            Quick Check-in…
          </span>
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground font-semibold">
            Ctrl K
          </kbd>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* User avatar / logout */}
          <form action={logoutAction}>
            <button
              id="logout-btn"
              type="submit"
              title={`Signed in as ${user.email} – Click to sign out`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border border-border bg-muted/40 hover:bg-muted transition-all duration-150 group cursor-pointer"
            >
              <div className="size-6 rounded-full bg-[oklch(0.55_0.22_270)] flex items-center justify-center text-white text-[10px] font-bold">
                {initials}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block max-w-[140px] truncate">
                {user.email}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      {/* Global Checkin Command Palette */}
      <CheckinCommandPalette
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
      />

      {/* Global Ticket Scanner Modal */}
      <TicketScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
      />
    </>
  );
}

