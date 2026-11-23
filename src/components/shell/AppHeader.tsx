"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  IconCalendar,
  IconMenu,
  IconPlus,
  IconSidebar,
  IconUser,
} from "@/components/icons/AppIcons";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { todayLocalISO } from "@/lib/client-forms";
import { requestOpenTodayEntry, storeEntryDate } from "@/lib/today-entry";
import { localeToBcp47, type AppLocale } from "@/i18n/config";
import { findActiveNavItem, type NavSection, type NavItem } from "./nav-config";

function formatHeaderDate(iso: string, withYear: boolean, locale: AppLocale): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(localeToBcp47(locale), {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  });
}

function resolveContextLabel(
  pathname: string,
  item: NavItem | null | undefined,
  tNav: (k: string) => string
): string | null {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "Profile";
  if (!item) return null;
  const map: Record<string, string> = {
    dashboard: tNav("dashboard"),
    approvals: "Approvals",
    stock: tNav("stock"),
    pnl: tNav("pnl"),
    "price-sheet": tNav("priceSheet"),
    "machine-production": tNav("machineProduction"),
    "machine-production-admin": tNav("mpAdmin"),
    users: tNav("users"),
    integrations: tNav("integrations"),
    audit: tNav("audit"),
  };
  return map[item.key] ?? item.label;
}

function HeaderDateAndEntry({
  today,
  dateLabel,
  dateShort,
  t,
}: {
  today: string;
  dateLabel: string;
  dateShort: string;
  t: (k: string) => string;
}) {
  const onAdd = () => {
    storeEntryDate(today);
    requestOpenTodayEntry();
  };
  return (
    <div className="dash-header__actions">
      <button type="button" className="dash-header__add-entry" onClick={onAdd}>
        <IconPlus size={16} />
        <span>{t("todaysEntry")}</span>
      </button>
      <time className="dash-header__date" dateTime={today}>
        <IconCalendar size={16} />
        <span className="dash-header__date-label">
          <span className="dash-header__date-full">{dateLabel}</span>
          <span className="dash-header__date-short">{dateShort}</span>
        </span>
      </time>
    </div>
  );
}

function HeaderRightControls({ showAppsHome }: { showAppsHome: boolean }) {
  const portal = (
    process.env.NEXT_PUBLIC_PORTAL_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_WORKSPACE_PUBLIC_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  const appsUrl =
    portal && !/localhost|127\.0\.0\.1/i.test(portal)
      ? `${portal}/apps`
      : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {showAppsHome && appsUrl ? (
        <a href={appsUrl} className="dash-header__logout dash-header__apps" title="All apps">
          Apps
        </a>
      ) : null}
      <LanguageSwitcher compact />
    </div>
  );
}

export type AppHeaderUser = {
  name: string | null;
  email: string;
  role: string;
  avatarUrl?: string | null;
  canAccessStock?: boolean;
};

type AppHeaderProps = {
  navSections: NavSection[];
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
  canEnter?: boolean;
  showAppsHome?: boolean;
};

export function AppHeader({
  navSections,
  sidebarCollapsed,
  onMenuClick,
  canEnter = false,
  showAppsHome = false,
}: AppHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const activeItem = findActiveNavItem(pathname, navSections);
  const homeHref = navSections.flatMap((s) => s.items).find((i) => i.key === "dashboard")?.href ?? "/";
  const today = useMemo(() => todayLocalISO(), []);
  const dateLabel = useMemo(() => formatHeaderDate(today, true, locale), [today, locale]);
  const dateShort = useMemo(() => formatHeaderDate(today, false, locale), [today, locale]);
  const contextLabel = resolveContextLabel(pathname, activeItem, tNav);

  return (
    <header className="dash-header">
      <button
        type="button"
        className="dash-header__hamburger"
        onClick={onMenuClick}
        aria-label={sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        aria-pressed={sidebarCollapsed}
      >
        {sidebarCollapsed ? <IconSidebar size={22} /> : <IconMenu size={22} />}
      </button>

      <Link href={homeHref} className="dash-header__brand">
        <span>{t("brandCable")}</span>
        <span>{t("brandJunction")}</span>
      </Link>

      {contextLabel ? <span className="dash-header__context">{contextLabel}</span> : null}
      <div className="dash-header__spacer" />

      {canEnter ? (
        <HeaderDateAndEntry today={today} dateLabel={dateLabel} dateShort={dateShort} t={t} />
      ) : null}

      <HeaderRightControls showAppsHome={showAppsHome} />
    </header>
  );
}
