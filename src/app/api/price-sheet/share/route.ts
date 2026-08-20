import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { sendPriceSheetWhatsApp } from "@/lib/aisensy";
import { formatPriceSheetSummary } from "@/lib/price-sheet-share";
import { toIndiaPhoneE164 } from "@/lib/phone";
import { canViewPriceSheet } from "@/lib/rbac";
import type { CableRate } from "@/lib/sheets/types";

const rateSchema = z.object({
  sNo: z.number().nullable(),
  name: z.string(),
  specification: z.string(),
  specificationFull: z.string(),
  p10: z.number(),
  p12: z.number(),
  p15: z.number(),
  p20: z.number(),
});

const shareSchema = z.object({
  phones: z.array(z.string().min(10).max(20)).min(1).max(50),
  rows: z.array(rateSchema).min(1).max(500),
});

function canShare(user: { globalRole: GlobalRole; canViewPriceSheet: boolean }) {
  return user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canShare(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid share payload" }, { status: 400 });
  }

  const phones = [
    ...new Set(
      parsed.data.phones
        .map((p) => toIndiaPhoneE164(p))
        .filter((p): p is string => Boolean(p)),
    ),
  ];
  if (phones.length === 0) {
    return NextResponse.json({ error: "No valid phone numbers" }, { status: 400 });
  }

  const rows = parsed.data.rows as CableRate[];
  const summary = formatPriceSheetSummary(rows);
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const userName =
    session.user.name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Cable Junction";

  const results: { phone: string; ok: boolean; message?: string }[] = [];

  for (const phone of phones) {
    const result = await sendPriceSheetWhatsApp({
      destination: phone,
      userName,
      itemCount: rows.length,
      dateLabel,
      summary,
    });
    results.push({
      phone,
      ok: result.ok,
      message: result.message,
    });
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  if (sent === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: results[0]?.message || "Could not send to any recipient",
        results,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    results,
  });
}
