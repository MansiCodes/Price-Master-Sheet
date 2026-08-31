"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizeIndiaPhoneInput } from "@/lib/phone";
import { isAisensyConfigured, sendAisensyOtp } from "@/lib/aisensy";

function generateOtpCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function requestPasswordResetOtp(phoneRaw: string) {
  try {
    const phone = normalizeIndiaPhoneInput(phoneRaw);
    if (!phone) {
      return { ok: false, error: "invalidPhone" };
    }

    // Check if user exists and is active
    const user = await prisma.user.findFirst({
      where: {
        phone,
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    });

    // If user doesn't exist, we still return ok to prevent user enumeration
    if (!user) {
      return { ok: true, message: "emailNotFoundOrInactive" }; // Key resolves to warning about inactive/unregistered number
    }

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the challenge
    await prisma.otpChallenge.create({
      data: {
        phone,
        codeHash,
        expiresAt,
        userId: user.id,
      },
    });

    const aisensyReady = await isAisensyConfigured();

    if (aisensyReady) {
      const sent = await sendAisensyOtp({
        destination: phone,
        userName: user.name || user.email,
        otp: code,
      });

      if (!sent.ok) {
        console.error("[AiSensy Password Reset OTP]", sent.message, sent.providerResponse);
        return { ok: false, error: "couldNotSendOtp" };
      }

      return {
        ok: true,
        expiresAt: expiresAt.toISOString(),
      };
    }

    // Dev mode fallback
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "couldNotSendOtp" };
    }

    console.warn(
      "[password-reset otp] AiSensy not configured — add API key in Admin → Integrations",
    );
    console.log(`[password-reset otp dev fallback] phone=${phone} code=${code}`);

    return {
      ok: true,
      stub: true,
      expiresAt: expiresAt.toISOString(),
      devCode: code,
    };
  } catch (err) {
    console.error("[requestPasswordResetOtp error]", err);
    return { ok: false, error: "errors.generic" };
  }
}

export async function verifyPasswordResetOtp(phoneRaw: string, codeRaw: string) {
  try {
    const phone = normalizeIndiaPhoneInput(phoneRaw);
    if (!phone) {
      return { ok: false, error: "invalidPhone" };
    }

    const code = codeRaw.trim();
    if (!/^\d{4}$/.test(code)) {
      return { ok: false, error: "invalidOtp" };
    }

    // Find latest active challenge for this phone number
    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        phone,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      return { ok: false, error: "invalidOrExpiredToken" };
    }

    // Verify OTP code
    const valid = await bcrypt.compare(code, challenge.codeHash);
    if (!valid) {
      return { ok: false, error: "invalidOtp" };
    }

    return { ok: true };
  } catch (err) {
    console.error("[verifyPasswordResetOtp error]", err);
    return { ok: false, error: "errors.generic" };
  }
}

export async function resetPasswordWithOtp(
  phoneRaw: string,
  codeRaw: string,
  newPassword: string,
) {
  try {
    const phone = normalizeIndiaPhoneInput(phoneRaw);
    if (!phone) {
      return { ok: false, error: "invalidPhone" };
    }

    const code = codeRaw.trim();
    if (!/^\d{4}$/.test(code)) {
      return { ok: false, error: "invalidOtp" };
    }

    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: "passwordTooShort" };
    }

    // Find latest active challenge for this phone number
    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        phone,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      return { ok: false, error: "invalidOrExpiredToken" };
    }

    // Verify OTP code
    const valid = await bcrypt.compare(code, challenge.codeHash);
    if (!valid) {
      return { ok: false, error: "invalidOtp" };
    }

    // Update user's password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: challenge.userId! },
      data: { passwordHash },
    });

    // Mark challenge as consumed
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumed: true },
    });

    return { ok: true };
  } catch (err) {
    console.error("[resetPasswordWithOtp error]", err);
    return { ok: false, error: "errors.generic" };
  }
}
