import {
  ROLE_LABEL,
  ROLES,
  type PlantOption,
  type RoleValue,
  type UserRow,
} from "./types";

export type UsersAdminLoadResult = {
  users: UserRow[];
  plants: PlantOption[];
  canManage: boolean;
  canManageSuperAdmins: boolean;
  primarySuperAdminEmail: string | null;
};

export async function loadUsersAdminData(): Promise<UsersAdminLoadResult> {
  const [usersRes, plantsRes] = await Promise.all([
    fetch("/api/admin/users"),
    fetch("/api/admin/plants"),
  ]);
  const usersText = await usersRes.text();
  const plantsText = await plantsRes.text();
  let usersJson: {
    ok?: boolean;
    message?: string;
    users?: UserRow[];
    canManage?: boolean;
    canManageSuperAdmins?: boolean;
    primarySuperAdminEmail?: string | null;
  };
  let plantsJson: {
    ok?: boolean;
    message?: string;
    plants?: PlantOption[];
  };
  try {
    usersJson = usersText
      ? (JSON.parse(usersText) as typeof usersJson)
      : { ok: false, message: "Empty response from users API" };
  } catch {
    throw new Error("Users API returned invalid JSON");
  }
  try {
    plantsJson = plantsText
      ? (JSON.parse(plantsText) as typeof plantsJson)
      : { ok: false, message: "Empty response from plants API" };
  } catch {
    throw new Error("Plants API returned invalid JSON");
  }
  if (!usersRes.ok || !usersJson.ok) {
    throw new Error(usersJson.message || "Failed to load users");
  }
  if (!plantsRes.ok || !plantsJson?.ok) {
    throw new Error(
      plantsJson?.message || `Failed to load plants (${plantsRes.status})`,
    );
  }
  return {
    users: usersJson.users ?? [],
    plants: plantsJson.plants ?? [],
    canManage: Boolean(usersJson.canManage),
    canManageSuperAdmins: Boolean(usersJson.canManageSuperAdmins),
    primarySuperAdminEmail:
      usersJson.primarySuperAdminEmail?.trim().toLowerCase() || null,
  };
}

export type UserFormSubmitPayload = {
  email: string;
  name: string;
  phone: string;
  password: string;
  globalRole: RoleValue;
  canViewPriceSheet: boolean;
  canMachineSupervise: boolean;
  canAdminMachineProduction: boolean;
  canAccessStock: boolean;
  isActive: boolean;
  plantIds: string[];
};

export async function saveUserForm(
  editing: UserRow | null,
  payload: UserFormSubmitPayload,
) {
  if (editing) {
    const body: Record<string, unknown> = {
      email: payload.email.trim(),
      name: payload.name.trim() || null,
      phone: payload.phone,
      globalRole: payload.globalRole,
      canViewPriceSheet: payload.canViewPriceSheet,
      canMachineSupervise: payload.canMachineSupervise,
      canAdminMachineProduction: payload.canAdminMachineProduction,
      canAccessStock: payload.canAccessStock,
      isActive: payload.isActive,
      plantIds: payload.plantIds,
    };
    if (payload.password.trim()) body.password = payload.password;
    const res = await fetch(`/api/admin/users/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Update failed");
    }
    return "User updated.";
  }

  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      name: payload.name.trim() || null,
      phone: payload.phone,
      password: payload.password,
      globalRole: payload.globalRole,
      canViewPriceSheet: payload.canViewPriceSheet,
      canMachineSupervise: payload.canMachineSupervise,
      canAdminMachineProduction: payload.canAdminMachineProduction,
      canAccessStock: payload.canAccessStock,
      plantIds: payload.plantIds,
    }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Create failed");
  }
  return "User created.";
}

export async function patchUserActive(userId: string, isActive: boolean) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Status update failed");
  }
}

export function exportUsersCsv(filtered: UserRow[]) {
  const rows = [
    [
      "Name",
      "Email",
      "Mobile",
      "Role",
      "Plants",
      "Price Sheet",
      "Machine Supervisor",
      "MP Admin",
      "Status",
    ],
    ...filtered.map((u) => [
      u.name ?? "",
      u.email,
      u.phone ?? "",
      ROLE_LABEL[u.globalRole as (typeof ROLES)[number]] ?? u.globalRole,
      u.globalRole === "SUPER_ADMIN" || u.globalRole === "VIEWER"
        ? "All plants"
        : (u.plantRoles ?? []).map((role) => role.plant.name).join(", "),
      u.canViewPriceSheet ? "Yes" : "No",
      u.canMachineSupervise ? "Yes" : "No",
      u.canAdminMachineProduction || u.globalRole === "SUPER_ADMIN"
        ? "Yes"
        : "No",
      u.isActive ? "Active" : "Inactive",
    ]),
  ];
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users.csv";
  a.click();
  URL.revokeObjectURL(url);
}
