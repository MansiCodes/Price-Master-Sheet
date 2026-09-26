import { GlobalRole } from "@prisma/client";
import {
  DATA_ENTRY_ROLES,
  FULL_PNL_ROLES,
  HYBRID_MACHINE_SUPERVISE_ROLES,
  MACHINE_PRODUCTION_ROLES,
  PNL_VIEW_ROLES,
  type MachineAccessOpts,
  type PriceSheetUser,
  type Role,
} from "@/lib/rbac-types";

/** Can open plant P&L area (managers see full; accountants see Sales + Purchase only). */
export function canViewPnl(role: GlobalRole | Role): boolean {
  return PNL_VIEW_ROLES.has(role);
}

/** Full P&L statement, stock, expense, FAR, etc. */
export function canViewFullPnl(role: GlobalRole | Role): boolean {
  return FULL_PNL_ROLES.has(role);
}

/** Accountant P&L is limited to Sales + Purchase registers of their own entries. */
export function isAccountantPnlLimited(role: GlobalRole | Role): boolean {
  return role === GlobalRole.ACCOUNTANT;
}

export function canEnterData(role: GlobalRole | Role): boolean {
  return DATA_ENTRY_ROLES.has(role);
}

export function canAccessMachineProduction(
  role: GlobalRole | Role,
  opts?: MachineAccessOpts,
): boolean {
  if (MACHINE_PRODUCTION_ROLES.has(role)) return true;
  if (opts?.canAdminMachineProduction) return true;
  return Boolean(opts?.canMachineSupervise);
}

export function canEnterMachineProduction(
  role: GlobalRole | Role,
  opts?: MachineAccessOpts,
): boolean {
  if (
    role === GlobalRole.MACHINE_SUPERVISOR ||
    role === GlobalRole.SUPER_ADMIN
  ) {
    return true;
  }
  if (opts?.canAdminMachineProduction) return true;
  return Boolean(opts?.canMachineSupervise);
}

export function canAdminMachineProduction(
  role: GlobalRole | Role,
  opts?: MachineAccessOpts,
): boolean {
  if (role === GlobalRole.SUPER_ADMIN) return true;
  return Boolean(opts?.canAdminMachineProduction);
}

/** True only for dedicated Machine Supervisor accounts (no plant shell). */
export function isMachineSupervisorOnly(role: GlobalRole | Role): boolean {
  return role === GlobalRole.MACHINE_SUPERVISOR;
}

/** @deprecated use isMachineSupervisorOnly — kept for call-site clarity */
export function isMachineSupervisor(role: GlobalRole | Role): boolean {
  return isMachineSupervisorOnly(role);
}

export function canViewPriceSheet(user: PriceSheetUser): boolean {
  return Boolean(user?.canViewPriceSheet);
}

export function isSuperAdmin(role: GlobalRole | Role): boolean {
  return role === GlobalRole.SUPER_ADMIN;
}

/** Email of the single Super Admin who may activate/deactivate other Super Admins. */
export function getPrimarySuperAdminEmail(): string | null {
  const email = (
    process.env.PRIMARY_SUPER_ADMIN_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  return email || null;
}

export function isPrimarySuperAdmin(
  email: string | null | undefined,
): boolean {
  const primary = getPrimarySuperAdminEmail();
  if (!primary || !email) return false;
  return email.trim().toLowerCase() === primary;
}

/**
 * Super Admin allowed to edit Quad/Signal Opening stock any time
 * (defaults to Tarun Jain). Others only get a one-time seed.
 */
export function getOpeningStockEditorEmail(): string | null {
  const email = (
    process.env.OPENING_STOCK_EDITOR_EMAIL ||
    "tarun@gmail.com"
  )
    .trim()
    .toLowerCase();
  return email || null;
}

export function canAlwaysEditQuadOpeningStock(
  email: string | null | undefined,
): boolean {
  const editor = getOpeningStockEditorEmail();
  if (!editor || !email) return false;
  return email.trim().toLowerCase() === editor;
}

/** Entry and shift approval is Super Admin only (Business Head is not involved). */
export function canApproveEntries(role: GlobalRole | Role): boolean {
  return isSuperAdmin(role);
}

export function isViewer(role: GlobalRole | Role): boolean {
  return role === GlobalRole.VIEWER;
}

/** Super Admin + Viewer: every active plant without per-plant assignment. */
export function hasGlobalPlantAccess(role: GlobalRole | Role): boolean {
  return isSuperAdmin(role) || isViewer(role);
}

/** List users in Admin → Users (view). Mutations stay Super Admin only. */
export function canViewUsersDirectory(role: GlobalRole | Role): boolean {
  return isSuperAdmin(role) || isViewer(role);
}

export function canManageUsers(role: GlobalRole | Role): boolean {
  return isSuperAdmin(role);
}

/** Same P&L filters / visibility as Super Admin (read path). */
export function usesSuperAdminPnlScope(role: GlobalRole | Role): boolean {
  return isSuperAdmin(role) || isViewer(role);
}

export function isPlantManager(role: GlobalRole | Role): boolean {
  return role === GlobalRole.PLANT_MANAGER;
}

export function isAdminOrHead(role: GlobalRole | Role): boolean {
  return (
    role === GlobalRole.SUPER_ADMIN || role === GlobalRole.BUSINESS_HEAD
  );
}

/**
 * Roles that see all entries for an accessible plant (not only their own).
 * Plant managers need full plant P&L so they don't duplicate another manager's day.
 */
export function canViewAllPlantEntries(role: GlobalRole | Role): boolean {
  return (
    role === GlobalRole.SUPER_ADMIN ||
    role === GlobalRole.BUSINESS_HEAD ||
    role === GlobalRole.PLANT_MANAGER ||
    role === GlobalRole.VIEWER
  );
}

/** Inverse of canViewAllPlantEntries — used by report/P&L query scoping. */
export function seesOwnEntriesOnly(role: GlobalRole | Role): boolean {
  return !canViewAllPlantEntries(role);
}

export function isBusinessHead(role: GlobalRole | Role): boolean {
  return role === GlobalRole.BUSINESS_HEAD;
}

export function isAccountant(role: GlobalRole | Role): boolean {
  return role === GlobalRole.ACCOUNTANT;
}

/** Accountants may only enter Purchase + Sales (forms and related tables). */
export function canEnterPurchaseAndSalesOnly(role: GlobalRole | Role): boolean {
  return isAccountant(role);
}

export function canEnterStockData(role: GlobalRole | Role): boolean {
  return canEnterData(role) && !isAccountant(role);
}

/** Stock page / stock-only Today's Entry via Extra access flag. */
export function hasStockExtraAccess(opts?: {
  canAccessStock?: boolean;
}): boolean {
  return Boolean(opts?.canAccessStock);
}

/**
 * Machine supervisors with Stock extra only enter Stock (not purchase/sale/expense).
 */
export function isStockEntryOnly(
  role: GlobalRole | Role,
  opts?: { canAccessStock?: boolean },
): boolean {
  return role === GlobalRole.MACHINE_SUPERVISOR && Boolean(opts?.canAccessStock);
}

export function canEnterExpenseData(role: GlobalRole | Role): boolean {
  return canEnterData(role) && !isAccountant(role);
}

export function canCombineMachineSupervise(role: GlobalRole | Role): boolean {
  return HYBRID_MACHINE_SUPERVISE_ROLES.has(role);
}
