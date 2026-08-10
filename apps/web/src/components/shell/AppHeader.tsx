"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
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

export type AppHeaderUser = {
  name: string | null;
  email: string;
  role: string;
};

type AppHeaderProps = {
  user: AppHeaderUser | null;
  navSections: NavSection[];
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
};

export function AppHeader({
  user,
  navSections,
  sidebarCollapsed,
  onMenuClick,
}: AppHeaderProps) {
  const pathname = usePathname();
  const activeItem = findActiveNavItem(pathname, navSections);

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
        Cable Junction
      </Link>

      {activeItem ? (
        <span className="dash-header__context">{activeItem.label}</span>
      ) : null}

      <div className="dash-header__spacer" />

      {user ? (
        <div className="dash-header__user">
          <span className="dash-header__avatar" aria-hidden="true">
            {initialsFor(user.name, user.email)}
          </span>
          <span className="dash-header__user-info">
            <span className="dash-header__user-name">{user.name ?? user.email}</span>
            <span className="dash-header__user-role">{formatRole(user.role)}</span>
          </span>
        </div>
      ) : null}

      <LogoutButton />
    </header>
  );
}
