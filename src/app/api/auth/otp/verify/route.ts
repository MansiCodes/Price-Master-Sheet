import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().regex(/^\d{4}$/),
});

/**
 * WhatsApp OTP verify stub — validates hashed code and marks consumed.
 * Session creation is deferred; returns { ok: true, stub: true }.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid phone or code" },
      { status: 400 },
    );
  }

  const phone = parsed.data.phone.trim();
  const code = parsed.data.code.trim();

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phone,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return NextResponse.json(
      { ok: false, message: "No valid OTP challenge" },
      { status: 400 },
    );
  }

  const valid = await bcrypt.compare(code, challenge.codeHash);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "Invalid code" }, { status: 400 });
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumed: true },
  });

  return NextResponse.json({ ok: true, stub: true });
}
