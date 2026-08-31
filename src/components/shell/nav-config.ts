/**
 * Single source of truth for the app shell navigation. Server layouts derive
 * `NavFlags` from the session/role and pass them down to the client shell,
 * which calls `getNavSections` to build the actual link list. Keeping the
 * link → href → icon mapping here (instead of scattered across components)
 * is what lets header + sidebar stay in sync without duplicating logic.
 */

export type NavIconName =
  | "home"
  | "today"
  | "purchase"
  | "sale"
  | "stock"
  | "manpower"
  | "pettyCash"
  | "electricity"
  | "assets"
  | "pnl"
  | "priceSheet"
  | "machineProduction"
  | "punctuality"
  | "plants"
  | "users"
  | "export"
  | "audit";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: NavIconName;
};

export type NavSection = {
  key: string;
  title: string;
  items: NavItem[];
};

export type NavFlags = {
  showPnl: boolean;
  showPriceSheet: boolean;
  showMachineProduction: boolean;
  /** Machine Supervisor: home is machine production, not plant P&L dashboard. */
  isMachineSupervisor?: boolean;
  showAdmin: boolean;
  showSuper: boolean;
  isManager: boolean;
  primaryPlantId: string | null;
  showSwitchPlant: boolean;
  selectedPlantName: string | null;
};

export function getNavSections(flags: NavFlags): NavSection[] {
  const {
    showPnl,
    showPriceSheet,
    showMachineProduction,
    isMachineSupervisor = false,
    showAdmin,
    showSuper,
    primaryPlantId,
  } = flags;
  const sections: NavSection[] = [];

  if (isMachineSupervisor) {
    sections.push({
      key: "work",
      title: "Work",
      items: [
        {
          key: "dashboard",
          label: "Dashboard",
          href: "/",
          icon: "home",
        },
        {
          key: "machine-production",
          label: "Machine Production",
          href: "/machine-production",
          icon: "machineProduction",
        },
      ],
    });
  } else {
    sections.push({
      key: "work",
      title: "Work",
      items: [
        {
          key: "dashboard",
          label: "Dashboard",
          href: "/",
          icon: "home",
        },
        ...(showAdmin
          ? [
              {
                key: "approvals",
                label: "Approvals",
                href: "/approvals",
                icon: "today" as const,
              },
            ]
          : []),
        ...(showMachineProduction
          ? [
              {
                key: "machine-production",
                label: "Machine Production",
                href: "/machine-production",
                icon: "machineProduction" as const,
              },
            ]
          : []),
      ],
    });
  }
  const reportItems: NavItem[] = [];
  if (showPnl && primaryPlantId) {
    reportItems.push({
      key: "pnl",
      label: "P&L",
      href: `/plants/${primaryPlantId}/pnl`,
      icon: "pnl",
    });
  }
  if (showPriceSheet) {
    reportItems.push({
      key: "price-sheet",
      label: "Price Sheet",
      href: "/price-sheet",
      icon: "priceSheet",
    });
  }
  if (reportItems.length > 0) {
    sections.push({ key: "reports", title: "Reports", items: reportItems });
  }

  const adminItems: NavItem[] = [];
  if (showSuper) {
    adminItems.push({ key: "users", label: "Users", href: "/admin/users", icon: "users" });
    adminItems.push({
      key: "integrations",
      label: "Integrations",
      href: "/admin/integrations",
      icon: "export",
    });
    adminItems.push({
      key: "machine-production-admin",
      label: "MP Admin",
      href: "/machine-production/admin",
      icon: "machineProduction",
    });
  }
  if (showAdmin) {
    adminItems.push({ key: "audit", label: "Audit trail", href: "/admin/audit", icon: "audit" });
  }
  if (adminItems.length > 0) {
    sections.push({ key: "admin", title: "Admin", items: adminItems });
  }

  return sections;
}

/** Longest-href-wins match so nested routes (e.g. plant sub-pages) resolve to the right link. */
export function findActiveNavItem(
  pathname: string,
  sections: NavSection[],
): NavItem | undefined {
  let best: NavItem | undefined;
  for (const section of sections) {
    for (const item of section.items) {
      const isMatch =
        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      if (isMatch && (!best || item.href.length > best.href.length)) {
        best = item;
      }
    }
  }
  return best;
}
