"use server";

import { cookies } from "next/headers";
import { REMEMBER_COOKIE, signOut } from "@/auth";

export async function logoutAction() {
  const jar = await cookies();
  jar.set(REMEMBER_COOKIE, "", { path: "/", maxAge: 0 });
  await signOut({ redirectTo: "/login" });
}
