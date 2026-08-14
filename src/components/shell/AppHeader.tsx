"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { todayLocalISO } from "@/lib/client-forms";
import {
  requestOpenTodayEntry,
  storeEntryDate,
} from "@/lib/today-entry";
import { findActiveNavItem, type NavSection } from "./nav-config";

function MenuIcon({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h10M4 17h16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function formatHeaderDate(iso: string, withYear: boolean): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  });
}

export type AppHeaderUser = {
  name: string | null;
  email: string;
  role: string;
};

type AppHeaderProps = {
  navSections: NavSection[];
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
  canEnter?: boolean;
};

export function AppHeader({
  navSections,
  sidebarCollapsed,
  onMenuClick,
  canEnter = false,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeItem = findActiveNavItem(pathname, navSections);
  const today = useMemo(() => todayLocalISO(), []);
  const dateLabel = useMemo(() => formatHeaderDate(today, true), [today]);
  const dateShort = useMemo(() => formatHeaderDate(today, false), [today]);

  function onAddTodayEntry() {
    storeEntryDate(today);
    if (pathname === "/") {
      requestOpenTodayEntry();
      return;
    }
    router.push(`/?addEntry=1`);
  }

  return (
    <header className="dash-header">
      <button
        type="button"
        className="dash-header__hamburger"
        onClick={onMenuClick}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={sidebarCollapsed}
      >
        <MenuIcon collapsed={sidebarCollapsed} />
      </button>

      <Link href="/" className="dash-header__brand">
        <span>Cable</span>
        <span>Junction</span>
      </Link>

      {activeItem ? (
        <span className="dash-header__context">{activeItem.label}</span>
      ) : null}

      <div className="dash-header__spacer" />

      {canEnter ? (
        <div className="dash-header__actions">
          <button
            type="button"
            className="dash-header__add-entry"
            onClick={onAddTodayEntry}
          >
            <PlusIcon />
            <span>Today&apos;s Entry</span>
          </button>

          <time className="dash-header__date" dateTime={today}>
            <CalendarIcon />
            <span className="dash-header__date-label">
              <span className="dash-header__date-full">{dateLabel}</span>
              <span className="dash-header__date-short">{dateShort}</span>
            </span>
          </time>
        </div>
      ) : null}

      <LogoutButton />
    </header>
  );
}
