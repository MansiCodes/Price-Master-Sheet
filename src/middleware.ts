import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE } from "@/auth.config";
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

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron")
  );
}

/**
 * Use getToken (read-only) instead of Auth.js `auth()` middleware.
 * The edge `authConfig` always had a 30-day session maxAge, which re-wrote
 * cookies and broke "Remember me" off (session should die when the browser closes).
 * Session length is applied correctly in `auth.ts` at sign-in / session refresh.
 */
export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  ensureLocaleCookie(req, res);

  const stale = req.cookies
    .getAll()
    .filter((c) => isStaleSessionCookie(c.name));

  if (stale.length > 0) {
    for (const cookie of stale) {
      expireCookie(res, cookie.name);
    }
  }

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) {
    return res;
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: SESSION_COOKIE,
    salt: SESSION_COOKIE,
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
