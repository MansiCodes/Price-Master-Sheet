import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getAccessiblePlantIds } from "@/lib/rbac";

export const SELECTED_PLANT_COOKIE = "cj.selected-plant";
/** Super-admin chose consolidated “All plants” view (not a missing cookie). */
export const ALL_PLANTS_COOKIE_VALUE = "__ALL__";
const DEFAULT_SUPER_ADMIN_PLANT_CODE = "CAT6";

export async function clearSelectedPlantCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SELECTED_PLANT_COOKIE);
}

export async function setSelectedPlantCookie(plantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SELECTED_PLANT_COOKIE, plantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setAllPlantsCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SELECTED_PLANT_COOKIE, ALL_PLANTS_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSelectedPlantId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SELECTED_PLANT_COOKIE)?.value;
  if (!raw || raw === ALL_PLANTS_COOKIE_VALUE) return null;

  const accessible = await getAccessiblePlantIds(userId);
  return accessible.includes(raw) ? raw : null;
}

async function defaultPlantId(accessible: string[]): Promise<string | null> {
  if (accessible.length === 0) return null;
  const cat6 = await prisma.plant.findFirst({
    where: {
      code: DEFAULT_SUPER_ADMIN_PLANT_CODE,
      isActive: true,
      id: { in: accessible },
    },
    select: { id: true },
  });
  return cat6?.id ?? accessible[0] ?? null;
}

/**
 * Resolves the active plant for shell / dashboard.
 * - Cookie plant id → that plant
 * - Cookie `__ALL__` (super admin) → null (all plants)
 * - No / invalid cookie → default plant (CAT-6 if available, else first accessible)
 *   so login can go straight to the dashboard; switch plants from the sidebar.
 */
export async function resolveSelectedPlantId(
  userId: string,
  options?: { isSuperAdmin?: boolean },
): Promise<string | null> {
  const accessible = await getAccessiblePlantIds(userId);
  if (accessible.length === 0) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(SELECTED_PLANT_COOKIE)?.value;

  if (raw === ALL_PLANTS_COOKIE_VALUE) {
    return options?.isSuperAdmin ? null : await defaultPlantId(accessible);
  }

  if (raw && accessible.includes(raw)) {
    return raw;
  }

  return defaultPlantId(accessible);
}

/** @deprecated Plant picker removed — always false; keep for callers. */
export async function needsPlantSelection(
  _userId: string,
  _options?: { isSuperAdmin?: boolean },
): Promise<boolean> {
  return false;
}
