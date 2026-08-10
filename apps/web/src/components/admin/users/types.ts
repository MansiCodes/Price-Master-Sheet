export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  globalRole: string;
  canViewPriceSheet: boolean;
  isActive: boolean;
  coinsBalance: number;
  createdAt: string;
};

export const ROLES = [
  "SUPER_ADMIN",
  "BUSINESS_HEAD",
  "PLANT_MANAGER",
  "ACCOUNTANT",
  "VIEWER",
] as const;

export type RoleValue = (typeof ROLES)[number];

export const ROLE_LABEL: Record<RoleValue, string> = {
  SUPER_ADMIN: "Super Admin",
  BUSINESS_HEAD: "Business Head",
  PLANT_MANAGER: "Plant Manager",
  ACCOUNTANT: "Accountant",
  VIEWER: "Viewer",
};

export function userInitials(name: string | null, email: string): string {
  const base = (name || email).trim();
  const parts = base.split(/[\s@_]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}
