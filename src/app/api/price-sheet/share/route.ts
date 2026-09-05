import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { sendPriceSheetWhatsApp } from "@/lib/aisensy";
import { uploadPriceSheetPdf } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { toIndiaPhoneE164 } from "@/lib/phone";
import { buildPriceSheetPdf } from "@/lib/price-sheet-pdf";
import { canViewPriceSheet } from "@/lib/rbac";
import type { CableRate } from "@/lib/sheets/types";

const rateSchema = z.object({
  sNo: z.number().optional().nullable().default(null),
  name: z.string().default("Cable"),
  specification: z.string().optional().nullable().default(""),
  specificationFull: z.string().optional().nullable().default(""),
  tab: z.string().optional().nullable().default(""),
  hyperlink: z.string().optional().nullable().default(""),
  rmCosting: z.number().default(0),
  rmCostingPerMtr: z.number().default(0),
  rmCostingPerBox: z.number().default(0),
  p10: z.number().default(0),
  p12: z.number().default(0),
  p15: z.number().default(0),
  p20: z.number().default(0),
});

const recipientSchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().max(120).optional().nullable(),
});

const shareSchema = z.object({
  recipients: z.array(recipientSchema).min(1).max(50).optional(),
  /** @deprecated prefer recipients */
  phones: z.array(z.string().min(10).max(20)).min(1).max(50).optional(),
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

  const rawRecipients =
    parsed.data.recipients ??
    (parsed.data.phones ?? []).map((phone) => ({ phone, name: null }));

  const recipients = new Map<string, string | null>();
  for (const row of rawRecipients) {
    const phone = toIndiaPhoneE164(row.phone);
    if (!phone) continue;
    const name = row.name?.trim() || null;
    if (!recipients.has(phone) || name) {
      recipients.set(phone, name);
    }
  }

  if (recipients.size === 0) {
    return NextResponse.json({ error: "No valid phone numbers" }, { status: 400 });
  }

  const rows = parsed.data.rows as CableRate[];
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  let pdf: { buffer: Buffer; filename: string };
  try {
    pdf = buildPriceSheetPdf(rows);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not generate price sheet PDF",
      },
      { status: 500 },
    );
  }

  const uploaded = await uploadPriceSheetPdf(pdf);
  if ("error" in uploaded) {
    return NextResponse.json(
      { ok: false, message: uploaded.error },
      { status: 503 },
    );
  }

  const results: { phone: string; ok: boolean; message?: string }[] = [];
  let index = 0;

  for (const [phone, name] of recipients) {
    if (index > 0) {
      // AiSensy/Meta often accept back-to-back calls but drop the 2nd delivery.
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    index += 1;

    const existing = await prisma.priceSheetRecipient
      .findUnique({
        where: { phone },
        select: { label: true },
      })
      .catch(() => null);

    const recipientName = name || existing?.label?.trim() || "there";

    const result = await sendPriceSheetWhatsApp({
      destination: phone,
      userName: recipientName,
      itemCount: rows.length,
      dateLabel,
      mediaUrl: uploaded.url,
      mediaFilename: pdf.filename,
    });

    results.push({
      phone,
      ok: result.ok,
      message: result.message,
    });

    console.log("[price-sheet/share]", {
      phone,
      recipientName,
      ok: result.ok,
      message: result.message,
      pdfUrl: uploaded.url,
      providerResponse: result.providerResponse,
    });

    await prisma.priceSheetRecipient
      .upsert({
        where: { phone },
        create: {
          phone,
          label: name,
          createdById: session.user.id,
        },
        update: {
          ...(name ? { label: name } : {}),
        },
      })
      .catch(() => null);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  if (sent === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: results[0]?.message || "Could not send PDF to any recipient",
        results,
        pdfUrl: uploaded.url,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    results,
    pdfUrl: uploaded.url,
  });
}
