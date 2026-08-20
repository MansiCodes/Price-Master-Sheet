import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toIndiaPhoneE164 } from "@/lib/phone";
import { canViewPriceSheet } from "@/lib/rbac";

function canManageRecipients(user: {
  globalRole: GlobalRole;
  canViewPriceSheet: boolean;
}) {
  return user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user);
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageRecipients(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.priceSheetRecipient.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, phone: true, label: true, createdAt: true },
  });

  return NextResponse.json({ rows });
}

const createSchema = z.object({
  phone: z.string().min(10).max(20),
  label: z.string().max(120).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageRecipients(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const phone = toIndiaPhoneE164(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const row = await prisma.priceSheetRecipient.upsert({
    where: { phone },
    create: {
      phone,
      label: parsed.data.label?.trim() || null,
      createdById: session.user.id,
    },
    update: {
      label: parsed.data.label?.trim() || null,
    },
    select: { id: true, phone: true, label: true, createdAt: true },
  });

  return NextResponse.json({ row }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageRecipients(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.priceSheetRecipient.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
