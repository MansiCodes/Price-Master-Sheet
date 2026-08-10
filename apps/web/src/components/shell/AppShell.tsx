"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader, type AppHeaderUser } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { getNavSections, type NavFlags } from "./nav-config";

const SIDEBAR_STORAGE_KEY = "cj-sidebar-collapsed";

type AppShellProps = {
  children: React.ReactNode;
  navFlags: NavFlags;
  user: AppHeaderUser | null;
};

export function AppShell({ children, navFlags, user }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    persistCollapsed(!collapsed);
  }, [collapsed, persistCollapsed]);

  /** Top hamburger: desktop collapses sidebar; mobile opens drawer. */
  const onHeaderMenu = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches) {
      setMobileOpen(true);
      return;
    }
    toggleCollapsed();
  }, [toggleCollapsed]);

  const navSections = useMemo(() => getNavSections(navFlags), [navFlags]);

  return (
    <div
      className={`dash-shell${ready ? "" : " dash-shell--settling"}${
        collapsed ? " dash-shell--collapsed" : ""
      }`}
    >
      <AppHeader
        user={user}
        navSections={navSections}
        sidebarCollapsed={collapsed}
        onMenuClick={onHeaderMenu}
      />
      <div className="dash-body">
        <AppSidebar
          navSections={navSections}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="dash-main">{children}</main>
      </div>
    </div>
  );
}
