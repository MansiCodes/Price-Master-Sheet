import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isAisensyConfigured, sendAisensyOtp } from "@/lib/aisensy";
import { prisma } from "@/lib/db";
import { normalizeIndiaPhoneInput } from "@/lib/phone";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
});

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** WhatsApp OTP — stores hashed code and sends via AiSensy when configured. */
export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid phone" }, { status: 400 });
    }

    const phone = normalizeIndiaPhoneInput(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { ok: false, message: "Enter a valid 10-digit mobile number" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { phone, isActive: true },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Mobile number is not registered" },
        { status: 404 },
      );
    }

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
        console.error("[AiSensy OTP]", sent.message, sent.providerResponse);
        const detail =
          sent.message && sent.message !== "AiSensy rejected the OTP request"
            ? sent.message
            : "Could not send OTP on WhatsApp. Check API key in Admin → Integrations.";
        return NextResponse.json(
          { ok: false, message: detail },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        expiresAt: expiresAt.toISOString(),
      });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, message: "WhatsApp OTP is not configured in Admin settings" },
        { status: 503 },
      );
    }

    console.warn(
      "[otp] AiSensy not configured — add API key in Admin → Integrations",
    );
    console.log(`[otp dev fallback] phone=${phone} code=${code}`);

    return NextResponse.json({
      ok: true,
      stub: true,
      expiresAt: expiresAt.toISOString(),
      devCode: code,
    });
  } catch (err: any) {
    console.error("[OTP Request Error]", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
