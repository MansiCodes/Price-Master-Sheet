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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "text" },
        code: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const phone = readCredential(credentials?.phone);
          const code = readCredential(credentials?.code);
          if (phone && code) {
            return await authorizeWithOtp(phone, code);
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
  },
});
