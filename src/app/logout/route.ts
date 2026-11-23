import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signOut } from "@/auth";
import { clearAuthCookies } from "@/lib/central/clear-auth-cookies";
import {
  isPortalLoginDelegated,
  portalPublicUrl,
} from "@/lib/central/portal-public-url";

/** Clear P&L session; Amplify returns to /login, portal builds return to Installation. */
export async function GET(request: Request) {
  const jar = await cookies();
  clearAuthCookies(jar);
  await signOut({ redirect: false });
  if (isPortalLoginDelegated()) {
    return NextResponse.redirect(`${portalPublicUrl()}/login`);
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
