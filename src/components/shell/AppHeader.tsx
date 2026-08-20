"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { todayLocalISO } from "@/lib/client-forms";
import {
  requestOpenTodayEntry,
  storeEntryDate,
} from "@/lib/today-entry";
import { localeToBcp47, type AppLocale } from "@/i18n/config";
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

function formatHeaderDate(iso: string, withYear: boolean, locale: AppLocale): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(localeToBcp47(locale), {
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
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const activeItem = findActiveNavItem(pathname, navSections);
  const today = useMemo(() => todayLocalISO(), []);
  const dateLabel = useMemo(
    () => formatHeaderDate(today, true, locale),
    [today, locale],
  );
  const dateShort = useMemo(
    () => formatHeaderDate(today, false, locale),
    [today, locale],
  );

  const contextLabel = (() => {
    if (!activeItem) return null;
    switch (activeItem.key) {
      case "dashboard":
        return tNav("dashboard");
      case "pnl":
        return tNav("pnl");
      case "price-sheet":
        return tNav("priceSheet");
      case "users":
        return tNav("users");
      case "integrations":
        return tNav("integrations");
      case "audit":
        return tNav("audit");
      default:
        return activeItem.label;
    }
  })();

  function onAddTodayEntry() {
    storeEntryDate(today);
    requestOpenTodayEntry();
  }

  return (
    <header className="dash-header">
      <button
        type="button"
        className="dash-header__hamburger"
        onClick={onMenuClick}
        aria-label={
          sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")
        }
        aria-pressed={sidebarCollapsed}
      >
        <MenuIcon collapsed={sidebarCollapsed} />
      </button>

      <Link href="/" className="dash-header__brand">
        <span>{t("brandCable")}</span>
        <span>{t("brandJunction")}</span>
      </Link>

      {contextLabel ? (
        <span className="dash-header__context">{contextLabel}</span>
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
            <span>{t("todaysEntry")}</span>
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

      <LanguageSwitcher compact />
      <LogoutButton />
    </header>
  );
}
