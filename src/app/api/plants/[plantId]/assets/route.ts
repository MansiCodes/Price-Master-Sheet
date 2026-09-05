import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { canAccessPlant, canEnterExpenseData } from "@/lib/rbac";

type Ctx = { params: Promise<{ plantId: string }> };

const createSchema = z.object({
  assetDescription: z.string().min(1).max(500),
  vendor: z.string().max(200).nullable().optional(),
  billNumber: z.string().max(100).nullable().optional(),
  billDate: z.string().nullable().optional(),
  cost: z.number().nonnegative(),
  gst: z.number().nonnegative().optional(),
  depreciationPercent: z.number().min(0).max(100).optional(),
});

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { plantId } = await context.params;
  if (!(await canAccessPlant(session.user.id, plantId))) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const assets = await prisma.fixedAsset.findMany({
    where: { plantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, assets });
}

export async function POST(request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { plantId } = await context.params;
  if (!(await canAccessPlant(session.user.id, plantId))) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  if (!canEnterExpenseData(session.user.globalRole)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const billDate = parseOptionalDate(parsed.data.billDate ?? null);
  if (parsed.data.billDate && !billDate) {
    return NextResponse.json(
      { ok: false, message: "Invalid billDate" },
      { status: 400 },
    );
  }

  const asset = await prisma.fixedAsset.create({
    data: {
      plantId,
      assetDescription: parsed.data.assetDescription.trim(),
      vendor: parsed.data.vendor?.trim() || null,
      billNumber: parsed.data.billNumber?.trim() || null,
      billDate,
      cost: parsed.data.cost,
      gst: parsed.data.gst ?? 0,
      depreciationPercent: parsed.data.depreciationPercent ?? 0,
    },
  });

  await writeAuditLog({
    entityType: "FixedAsset",
    entityId: asset.id,
    field: "create",
    newValue: {
      assetDescription: asset.assetDescription,
      cost: Number(asset.cost),
    },
    actorId: session.user.id,
    plantId,
  });

  return NextResponse.json({ ok: true, asset }, { status: 201 });
}
