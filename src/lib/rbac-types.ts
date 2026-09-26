import { GlobalRole } from "@prisma/client";

/** Role enum matching Prisma GlobalRole */
export const Role = GlobalRole;
export type Role = GlobalRole;

export type PriceSheetUser = {
  canViewPriceSheet: boolean;
};

export type MachineAccessOpts = {
  /** Plant Manager / Accountant also acting as Machine Supervisor */
  canMachineSupervise?: boolean;
  /** Extra Machine Production admin (MP Admin) for non Super Admin users */
  canAdminMachineProduction?: boolean;
};

export const PNL_VIEW_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.VIEWER,
  GlobalRole.ACCOUNTANT,
]);

/** Full P&L statement + stock/expense tabs (not accountants). */
export const FULL_PNL_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.VIEWER,
]);

export const DATA_ENTRY_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.ACCOUNTANT,
  GlobalRole.MACHINE_SUPERVISOR,
]);

/** Primary Machine Production roles (full MS shell). */
export const MACHINE_PRODUCTION_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.MACHINE_SUPERVISOR,
]);

/** Roles that may combine with Machine Supervisor via canMachineSupervise. */
export const HYBRID_MACHINE_SUPERVISE_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.PLANT_MANAGER,
  GlobalRole.ACCOUNTANT,
]);
