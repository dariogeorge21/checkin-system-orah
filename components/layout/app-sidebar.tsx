"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  HandshakeIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: DashboardSquare01Icon,
    id: "nav-dashboard",
  },
  {
    label: "Participants",
    href: "/participants",
    icon: UserGroupIcon,
    id: "nav-participants",
  },
  {
    label: "Volunteers",
    href: "/volunteers",
    icon: HandshakeIcon,
    id: "nav-volunteers",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="flex-shrink-0 flex items-center justify-center size-8 rounded-lg overflow-hidden">
            <Image
              src="/JyLogo.png"
              alt="Jesus Youth Logo"
              width={32}
              height={32}
              className="size-8 object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">Orah</span>
            <span className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">Campus Meet 2026</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-4 py-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  {/* Use render prop to make SidebarMenuButton render as a Next.js Link */}
                  <SidebarMenuButton
                    render={<Link href={item.href} id={item.id} />}
                    isActive={isActive}
                    className={cn(
                      "mx-2 rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-[oklch(0.55_0.22_270)]/10 text-[oklch(0.55_0.22_270)] font-medium"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-[oklch(0.55_0.22_270)]" : "text-sidebar-foreground/50"
                      )}
                    />
                    <span className="text-sm">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        <p className="text-[10px] text-sidebar-foreground/20 text-center">
          JY Pala Missionaries
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
