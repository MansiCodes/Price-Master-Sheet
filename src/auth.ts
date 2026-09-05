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

  // Find the most recent unconsumed challenge for this phone number
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

  // Check OTP code validity with bcrypt
  const valid = await bcrypt.compare(code, challenge.codeHash);
  if (!valid) {
    console.warn(`[authorizeWithOtp] Invalid OTP code for ${phone}`);
    return null;
  }

  // Mark challenge as consumed
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

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

function readRememberMeFromRequest(req: Request | undefined): boolean {
  if (!req) return false;
  if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
    if ((req as any).cookies.get("cj.remember-me")?.value === "true") return true;
  }
  if (req.headers && typeof req.headers.get === "function") {
    const cookieHeader = req.headers.get("cookie") || "";
    if (cookieHeader.includes("cj.remember-me=true")) return true;
  }
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
  const rememberMe = readRememberMeFromRequest(req);
  const maxAge = rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;

  return {
    ...authConfig,
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    session: {
      ...authConfig.session,
      maxAge,
      // Refresh periodically so a 30-day login stays alive while in use
      updateAge: rememberMe ? 24 * 60 * 60 : SESSION_MAX_AGE,
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
          // Persistent cookie when Remember me is on; browser-session cookie when off
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
