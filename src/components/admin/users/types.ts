export type PlantOption = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type UserPlantRoleRow = {
  plantId: string;
  role: string;
  plant: { id: string; name: string; code: string };
};

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  globalRole: string;
  creditScore: number | null;
  canViewPriceSheet: boolean;
  isActive: boolean;
  coinsBalance: number;
  createdAt: string;
  plantRoles?: UserPlantRoleRow[];
};

export const ROLES = [
  "SUPER_ADMIN",
  "BUSINESS_HEAD",
  "PLANT_MANAGER",
  "ACCOUNTANT",
  "VIEWER",
  "MACHINE_SUPERVISOR",
] as const;

export type RoleValue = (typeof ROLES)[number];

export const ROLE_LABEL: Record<RoleValue, string> = {
  SUPER_ADMIN: "Super Admin",
  BUSINESS_HEAD: "Business Head",
  PLANT_MANAGER: "Plant Manager",
  ACCOUNTANT: "Accountant",
  VIEWER: "Viewer",
  MACHINE_SUPERVISOR: "Machine Supervisor",
};

export function userInitials(name: string | null, email: string): string {
  const base = (name || email).trim();
  const parts = base.split(/[\s@_]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

export {
  indianMobileDigits,
  toIndiaPhoneE164,
  fromStoredIndiaPhone,
} from "@/lib/phone";
