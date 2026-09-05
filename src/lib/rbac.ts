import { GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Role enum matching Prisma GlobalRole */
export const Role = GlobalRole;
export type Role = GlobalRole;

export type PriceSheetUser = {
  canViewPriceSheet: boolean;
};

export type MachineAccessOpts = {
  /** Plant Manager / Accountant also acting as Machine Supervisor */
  canMachineSupervise?: boolean;
};

const PNL_VIEW_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.VIEWER,
  GlobalRole.ACCOUNTANT,
]);

/** Full P&L statement + stock/expense tabs (not accountants). */
const FULL_PNL_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.VIEWER,
]);

const DATA_ENTRY_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.ACCOUNTANT,
  GlobalRole.MACHINE_SUPERVISOR,
]);

/** Primary Machine Production roles (full MS shell). */
const MACHINE_PRODUCTION_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.MACHINE_SUPERVISOR,
]);

/** Roles that may combine with Machine Supervisor via canMachineSupervise. */
export const HYBRID_MACHINE_SUPERVISE_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.PLANT_MANAGER,
  GlobalRole.ACCOUNTANT,
]);

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
  return Boolean(opts?.canMachineSupervise);
}

export function canAdminMachineProduction(role: GlobalRole | Role): boolean {
  return role === GlobalRole.SUPER_ADMIN;
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

export function canEnterExpenseData(role: GlobalRole | Role): boolean {
  return canEnterData(role) && !isAccountant(role);
}

export function canCombineMachineSupervise(role: GlobalRole | Role): boolean {
  return HYBRID_MACHINE_SUPERVISE_ROLES.has(role);
}

export async function canAccessPlant(
  userId: string,
  plantId: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      globalRole: true,
      isActive: true,
      plantRoles: {
        where: { plantId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!user || !user.isActive) return false;
  if (user.globalRole === GlobalRole.SUPER_ADMIN) return true;
  return user.plantRoles.length > 0;
}

export async function getAccessiblePlantIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      globalRole: true,
      isActive: true,
      plantRoles: { select: { plantId: true } },
    },
  });

  if (!user || !user.isActive) return [];

  if (user.globalRole === GlobalRole.SUPER_ADMIN) {
    const plants = await prisma.plant.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    return plants.map((p) => p.id);
  }

  if (user.plantRoles.length > 0) {
    return user.plantRoles.map((r) => r.plantId);
  }

  // Plant managers created without a plant still need a dashboard + today's report.
  if (user.globalRole === GlobalRole.PLANT_MANAGER) {
    const plant = await prisma.plant.findFirst({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    if (!plant) return [];
    await prisma.userPlantRole.upsert({
      where: { userId_plantId: { userId, plantId: plant.id } },
      create: {
        userId,
        plantId: plant.id,
        role: GlobalRole.PLANT_MANAGER,
      },
      update: {},
    });
    return [plant.id];
  }

  return [];
}
