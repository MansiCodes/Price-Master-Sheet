import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { normalizeIndiaPhoneInput } from "@/lib/phone";

function readCredential(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

async function authorizeWithOtp(phoneRaw: string, codeRaw: string) {
  const phone = normalizeIndiaPhoneInput(phoneRaw);
  const code = codeRaw.trim();
  if (!phone || !/^\d{4,10}$/.test(code)) return null;

  const user = await prisma.user.findFirst({
    where: { phone, isActive: true },
  });
  if (!user) return null;

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phone,
      consumed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    console.warn(`[authorizeWithOtp] No active OTP challenge found for ${phone}`);
    return null;
  }

  const valid = await bcrypt.compare(code, challenge.codeHash);
  if (!valid) {
    console.warn(`[authorizeWithOtp] Invalid OTP code for ${phone}`);
    return null;
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumed: true },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    globalRole: user.globalRole,
    canViewPriceSheet: user.canViewPriceSheet,
    canMachineSupervise: user.canMachineSupervise,
  };
}

export const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
export const REMEMBER_COOKIE = "cj.remember-me";

function readRememberMeFromCookieHeader(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)cj\.remember-me=true(?:;|$)/.test(cookieHeader);
}

function readRememberMeFromRequest(req: Request | undefined): boolean {
  if (!req) return false;
  if ("cookies" in req && typeof (req as { cookies?: { get?: (n: string) => { value: string } | undefined } }).cookies?.get === "function") {
    if ((req as { cookies: { get: (n: string) => { value: string } | undefined } }).cookies.get(REMEMBER_COOKIE)?.value === "true") {
      return true;
    }
  }
  if (req.headers && typeof req.headers.get === "function") {
    return readRememberMeFromCookieHeader(req.headers.get("cookie"));
  }
  return false;
}

async function resolveRememberMe(req: Request | undefined): Promise<boolean> {
  // Login POST: prefer the form field (source of truth from checkbox).
  if (req && req.method === "POST") {
    try {
      const form = await req.clone().formData();
      const flag = form.get("rememberMe");
      if (flag === "1" || flag === "true") return true;
      if (flag === "0" || flag === "false") return false;
    } catch {
      // Not multipart/form-urlencoded (e.g. session fetch) — fall through.
    }
  }

  if (req) return readRememberMeFromRequest(req);

  // RSC / signOut helpers: no Request — read the cookie from next/headers.
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    return jar.get(REMEMBER_COOKIE)?.value === "true";
  } catch {
    return false;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(async (req) => {
  const rememberMe = await resolveRememberMe(req);
  const maxAge = rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;

  return {
    ...authConfig,
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    session: {
      ...authConfig.session,
      maxAge,
      // Keep a 30-day login alive while in use; short sessions refresh near expiry.
      updateAge: rememberMe ? 24 * 60 * 60 : Math.floor(SESSION_MAX_AGE / 2),
    },
    jwt: {
      ...authConfig.jwt,
      maxAge,
    },
    cookies: {
      ...authConfig.cookies,
      sessionToken: {
        ...authConfig.cookies?.sessionToken,
        options: {
          ...authConfig.cookies?.sessionToken?.options,
          // Persistent cookie when Remember me is on; browser-session cookie when off.
          maxAge: rememberMe ? maxAge : undefined,
        },
      },
    },
    providers: [
      Credentials({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
          phone: { label: "Phone", type: "text" },
          code: { label: "OTP Code", type: "text" },
          rememberMe: { label: "Remember me", type: "text" },
        },
        async authorize(credentials) {
          try {
            const rememberFlag = readCredential(credentials?.rememberMe) === "1";
            const phone = readCredential(credentials?.phone);
            const code = readCredential(credentials?.code);
            if (phone && code) {
              const user = await authorizeWithOtp(phone, code);
              return user ? { ...user, rememberMe: rememberFlag } : null;
            }

            const email = readCredential(credentials?.email).toLowerCase().trim();
            const password = readCredential(credentials?.password);
            if (!email || !password || !email.includes("@")) {
              return null;
            }

            const user = await prisma.user.findUnique({
              where: { email },
            });

            if (!user || !user.isActive || !user.passwordHash) {
              return null;
            }

            const valid = await bcrypt.compare(password, user.passwordHash);
            if (!valid) return null;

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              globalRole: user.globalRole,
              canViewPriceSheet: user.canViewPriceSheet,
              canMachineSupervise: user.canMachineSupervise,
              rememberMe: rememberFlag,
            };
          } catch (err) {
            console.error("[NextAuth authorize error]", err);
            return null;
          }
        },
      }),
    ],
    callbacks: {
      ...authConfig.callbacks,
      jwt({ token, user }) {
        if (user) {
          token.id = user.id!;
          token.email = user.email;
          token.globalRole = user.globalRole;
          token.canViewPriceSheet = user.canViewPriceSheet;
          token.canMachineSupervise = Boolean(user.canMachineSupervise);
          token.rememberMe = Boolean(
            (user as { rememberMe?: boolean }).rememberMe,
          );
        }
        return token;
      },
    },
  };
});
