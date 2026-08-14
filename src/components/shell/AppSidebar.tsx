"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppHeaderUser } from "./AppHeader";
import type { NavIconName, NavSection } from "./nav-config";

/** Minimal stroke-icon set (24x24) — no extra icon dependency. */
const ICON_PATHS: Record<NavIconName, string> = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9",
  today: "M4 5h16v15H4V5Zm0 5h16M8 3v4M16 3v4M8.5 14.5l1.7 1.7L14.5 12",
  purchase:
    "M3 5h2l1.6 9.6a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  sale: "M3 17l6-6 4 4 8-8M15 6h6v6",
  stock: "M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 9v9M4 7l8 4 8-4",
  manpower:
    "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.7-5 6-5s6 2 6 5M14 15c3 0 6 2 6 5",
  pettyCash:
    "M3 7h18v11H3V7Zm0 0 2-3h14l2 3M15 12.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  electricity: "M13 3 5 14h6l-1 7 8-11h-6l1-7Z",
  assets: "M4 4h16v6H4V4Zm0 10h16v6H4v-6ZM7 7h.01M7 17h.01",
  pnl: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  priceSheet:
    "M6 3h9l6 6v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 9h6m-6 4h6m-6-8h2",
  punctuality: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2",
  plants: "M4 21V10l8-6 8 6v11M9 21v-6h6v6M4 10h16",
  users: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 20c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5M14 15.5c2.8 0 5.5 1.8 5.5 4.5",
  export:
    "M12 3v12m0 0-4-4m4 4 4-4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  audit:
    "M8 3h8l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm0 6h8m-8 4h8m-8 4h5M16 3v4h4",
};

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function initialsFor(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  return email.slice(0, 2).toUpperCase();
}

function SidebarUser({
  user,
  showLabels,
}: {
  user: AppHeaderUser;
  showLabels: boolean;
}) {
  return (
    <div className="dash-sidebar__user" title={user.email}>
      <span className="dash-header__avatar" aria-hidden="true">
        {initialsFor(user.name, user.email)}
      </span>
      {showLabels ? (
        <div className="dash-sidebar__user-meta">
          <span className="dash-header__user-name">{formatRole(user.role)}</span>
          <span className="dash-sidebar__user-email" title={user.email}>
            {user.email}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function SidebarNav({
  navSections,
  pathname,
  showLabels,
  onNavigate,
}: {
  navSections: NavSection[];
  pathname: string;
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="dash-sidebar__nav" aria-label="Main">
      {navSections.map((section) => (
        <div className="dash-sidebar__section" key={section.key}>
          {showLabels ? (
            <div className="dash-sidebar__section-title">{section.title}</div>
          ) : null}
          {section.items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className="dash-sidebar__link"
                title={showLabels ? undefined : item.label}
              >
                <span className="dash-sidebar__icon">
                  <NavIcon name={item.icon} />
                </span>
                <span className="dash-sidebar__label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

type AppSidebarProps = {
  navSections: NavSection[];
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: AppHeaderUser | null;
};

export function AppSidebar({
  navSections,
  collapsed,
  mobileOpen,
  onCloseMobile,
  user,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside
        className={`dash-sidebar${collapsed ? " dash-sidebar--collapsed" : ""}`}
        aria-label="Sidebar"
      >
        <SidebarNav
          navSections={navSections}
          pathname={pathname}
          showLabels={!collapsed}
        />
        {user ? <SidebarUser user={user} showLabels={!collapsed} /> : null}
      </aside>

      {mobileOpen ? (
        <div
          className="dash-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="dash-mobile-nav__backdrop"
            aria-label="Close navigation"
            onClick={onCloseMobile}
          />
          <div className="dash-mobile-nav__panel">
            <SidebarNav
              navSections={navSections}
              pathname={pathname}
              showLabels
              onNavigate={onCloseMobile}
            />
            {user ? <SidebarUser user={user} showLabels /> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
