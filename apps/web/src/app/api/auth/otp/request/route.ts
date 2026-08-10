import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
});

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** WhatsApp OTP stub — stores hashed code; logs plaintext in development. */
export async function POST(request: Request) {
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

  const phone = parsed.data.phone.trim();
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const user = await prisma.user.findFirst({
    where: { phone, isActive: true },
    select: { id: true },
  });

  await prisma.otpChallenge.create({
    data: {
      phone,
      codeHash,
      expiresAt,
      userId: user?.id ?? null,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[otp stub] phone=${phone} code=${code}`);
  }

  console.log(
    `[WhatsApp stub] OTP for ${phone}: would send code via WhatsApp`,
  );

  return NextResponse.json({
    ok: true,
    stub: true,
    expiresAt: expiresAt.toISOString(),
  });
}
