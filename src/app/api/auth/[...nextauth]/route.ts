import type { NextRequest } from "next/server";
import { handlers, REMEMBER_COOKIE } from "@/auth";
import { SESSION_COOKIE } from "@/auth.config";

/**
 * Auth.js always stamps session cookies with `Expires` from `session.maxAge`.
 * Setting `cookies.sessionToken.options.maxAge = undefined` does nothing.
 * For Remember-me OFF we strip Expires/Max-Age so the browser treats it as a
 * session cookie (cleared when the browser closes). JWT still expires in 8h.
 */
async function wantsPersistentSession(req: NextRequest): Promise<boolean> {
  if (req.method === "POST") {
    try {
      const form = await req.clone().formData();
      const flag = form.get("rememberMe");
      if (flag === "1" || flag === "true") return true;
      if (flag === "0" || flag === "false") return false;
    } catch {
      // not form data
    }
  }

  return req.cookies.get(REMEMBER_COOKIE)?.value === "true";
}

function isSessionTokenCookie(setCookie: string): boolean {
  const name = setCookie.split("=", 1)[0]?.trim() ?? "";
  return (
    name === SESSION_COOKIE ||
    name.startsWith(`${SESSION_COOKIE}.`) ||
    name === `__Secure-${SESSION_COOKIE}` ||
    name.startsWith(`__Secure-${SESSION_COOKIE}.`)
  );
}

function toBrowserSessionCookie(setCookie: string): string {
  // Keep deletion cookies intact.
  if (/;\s*Max-Age=0(?:;|$)/i.test(setCookie)) return setCookie;
  return setCookie
    .replace(/;\s*Expires=[^;]*/gi, "")
    .replace(/;\s*Max-Age=[^;]*/gi, "");
}

async function withRememberMeCookiePolicy(
  req: NextRequest,
  res: Response,
): Promise<Response> {
  if (await wantsPersistentSession(req)) return res;

  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  if (!raw.length) return res;

  const headers = new Headers(res.headers);
  headers.delete("set-cookie");
  for (const cookie of raw) {
    headers.append(
      "set-cookie",
      isSessionTokenCookie(cookie) ? toBrowserSessionCookie(cookie) : cookie,
    );
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export async function GET(req: NextRequest) {
  const res = await handlers.GET(req);
  return withRememberMeCookiePolicy(req, res);
}

export async function POST(req: NextRequest) {
  const res = await handlers.POST(req);
  return withRememberMeCookiePolicy(req, res);
}
