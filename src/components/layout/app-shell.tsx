"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarRange,
  Gauge,
  ListChecks,
  Menu,
  PalmtreeIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/tasks", label: "General Tasks", icon: ListChecks },
  { href: "/cleanroom", label: "Cleanroom Setup", icon: ShieldCheck },
  { href: "/weekly-roster", label: "Weekly Roster", icon: CalendarRange },
  { href: "/daily", label: "Daily Schedule", icon: CalendarClock },
  { href: "/leave", label: "Leave", icon: PalmtreeIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));

  return (
    <div className="flex min-h-screen">
      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-ink px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 text-bg">
          <Logo />
          <span className="font-mono text-xs font-semibold tracking-[0.2em]">ROSTER CTRL</span>
        </Link>
        <button aria-label="Open navigation" onClick={() => setOpen(true)} className="text-bg">
          <Menu className="size-5" />
        </button>
      </div>

      {/* sidebar - the "control panel frame", always dark regardless of theme */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5 text-bg" onClick={() => setOpen(false)}>
            <Logo />
            <span className="font-mono text-xs font-semibold tracking-[0.2em]">ROSTER CTRL</span>
          </Link>
          <button aria-label="Close navigation" onClick={() => setOpen(false)} className="text-bg/70 md:hidden">
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {NAV.map((item) => {
            const isActive = active?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[13.5px] font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white",
                  isActive && "bg-white/10 text-white"
                )}
              >
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r bg-signal" />
                )}
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <p className="px-2 text-[11px] leading-relaxed text-white/35">
            Cleaning Roster Scheduler
            <br />
            Stage 2 prototype
          </p>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-ink/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* main content */}
      <div className="flex min-h-screen w-full flex-1 flex-col pt-14 md:ml-64 md:pt-0">
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-steel-line bg-bg/85 px-6 backdrop-blur md:flex">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            {active?.label ?? "Roster Control"}
          </p>
          <ThemeToggle />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 12h10M7 8h6M7 16h4" stroke="var(--signal)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
