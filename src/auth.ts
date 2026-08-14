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
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return null;

  const valid = await bcrypt.compare(code, challenge.codeHash);
  if (!valid) return null;

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
        const phone = readCredential(credentials?.phone);
        const code = readCredential(credentials?.code);
        if (phone && code) {
          return authorizeWithOtp(phone, code);
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
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
  },
});
