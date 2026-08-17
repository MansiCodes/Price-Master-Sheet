"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessPlant, isSuperAdmin } from "@/lib/rbac";
import {
  clearSelectedPlantCookie,
  setSelectedPlantCookie,
} from "@/lib/selected-plant";

export async function selectPlantAction(plantId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowed = await canAccessPlant(session.user.id, plantId);
  if (!allowed) {
    throw new Error("You do not have access to this plant.");
  }

  await setSelectedPlantCookie(plantId);

  redirect("/welcome");
}

export async function clearPlantSelectionAction() {
  await clearSelectedPlantCookie();
}

export async function viewAllPlantsAction() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!isSuperAdmin(session.user.globalRole)) {
    throw new Error("Only a super admin can view all plants at once.");
  }

  await clearSelectedPlantCookie();
  redirect("/");
}
