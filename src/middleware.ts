import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig, SESSION_COOKIE } from "@/auth.config";
import {
  defaultLocale,
  isAppLocale,
  LOCALE_COOKIE,
} from "@/i18n/config";

/** Old Auth.js / NextAuth cookie names that must never be decrypted with the current secret. */
const STALE_COOKIE_PREFIXES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "cj.session-token", // pre-v2 (exact + chunked .0/.1…)
  "cj.session-token.v2",
  "__Secure-cj.session-token.v2",
];

function isStaleSessionCookie(name: string): boolean {
  if (name === SESSION_COOKIE || name.startsWith(`${SESSION_COOKIE}.`)) {
    return false;
  }
  return STALE_COOKIE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}.`),
  );
}

function expireCookie(res: NextResponse, name: string) {
  const secure =
    name.startsWith("__Secure-") ||
    name.startsWith("__Host-") ||
    process.env.NODE_ENV === "production";
  const opts = {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
  };
  res.cookies.set(name, "", opts);
  for (let i = 0; i < 6; i += 1) {
    res.cookies.set(`${name}.${i}`, "", opts);
  }
}

function ensureLocaleCookie(req: NextRequest, res: NextResponse) {
  const raw = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isAppLocale(raw)) return;
  res.cookies.set(LOCALE_COOKIE, defaultLocale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
}

const { auth } = NextAuth(authConfig);

/** Auth.js middleware (authorized callback in authConfig handles redirects). */
const withAuth = auth((req) => {
  const res = NextResponse.next();
  ensureLocaleCookie(req, res);
  return res;
});

/**
 * 1) If browser still has old session cookies → expire them and redirect once
 *    (so Auth.js never tries to decrypt them → no JWTSessionError spam).
 * 2) Otherwise run Auth.js middleware as usual.
 */
export default async function middleware(req: NextRequest) {
  const stale = req.cookies
    .getAll()
    .filter((c) => isStaleSessionCookie(c.name));

  if (stale.length > 0) {
    const res = NextResponse.next();
    for (const cookie of stale) {
      expireCookie(res, cookie.name);
    }
    ensureLocaleCookie(req, res);
    return res;
  }

  // Auth.js middleware typing is overloaded; cast keeps Next middleware signature clean.
  return (withAuth as (req: NextRequest) => ReturnType<typeof withAuth>)(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
