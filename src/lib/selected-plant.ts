import { cookies } from "next/headers";
import { getAccessiblePlantIds } from "@/lib/rbac";

export const SELECTED_PLANT_COOKIE = "cj.selected-plant";

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

export async function getSelectedPlantId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SELECTED_PLANT_COOKIE)?.value;
  if (!raw) return null;

  const accessible = await getAccessiblePlantIds(userId);
  return accessible.includes(raw) ? raw : null;
}

export async function resolveSelectedPlantId(
  userId: string,
  options?: { isSuperAdmin?: boolean },
): Promise<string | null> {
  if (options?.isSuperAdmin) return null;

  const accessible = await getAccessiblePlantIds(userId);
  if (accessible.length === 0) return null;

  return getSelectedPlantId(userId);
}

export async function needsPlantSelection(
  userId: string,
  options?: { isSuperAdmin?: boolean },
): Promise<boolean> {
  if (options?.isSuperAdmin) return false;

  const accessible = await getAccessiblePlantIds(userId);
  if (accessible.length === 0) return false;

  const selected = await getSelectedPlantId(userId);
  return !selected;
}
