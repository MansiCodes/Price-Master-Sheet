import { NextRequest, NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/api";
import { canAccessPlant } from "@/lib/rbac";
import type { EntryApprovalKind } from "@/lib/entry-approval";
import { shouldAutoApproveEntry } from "@/lib/entry-approval";

type ApproveBody = {
  id: string;
  kind: EntryApprovalKind;
  action: "approve_head" | "reject_head";
  reason?: string;
};

async function findEntry(kind: EntryApprovalKind, id: string) {
  const include = {
    enteredBy: { select: { globalRole: true } },
  };
  switch (kind) {
    case "purchase":
      return prisma.purchase.findUnique({ where: { id }, include });
    case "sale":
      return prisma.sale.findUnique({ where: { id }, include });
    case "stock":
      return prisma.stockEntry.findUnique({ where: { id }, include });
    case "expense":
      return prisma.pettyCashEntry.findUnique({ where: { id }, include });
  }
}

async function updateEntry(
  kind: EntryApprovalKind,
  id: string,
  data: Record<string, unknown>,
) {
  switch (kind) {
    case "purchase":
      return prisma.purchase.update({ where: { id }, data });
    case "sale":
      return prisma.sale.update({ where: { id }, data });
    case "stock":
      return prisma.stockEntry.update({ where: { id }, data });
    case "expense":
      return prisma.pettyCashEntry.update({ where: { id }, data });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  if (session.user.globalRole !== GlobalRole.BUSINESS_HEAD) {
    return NextResponse.json(
      { error: "Only Business Head can approve entries" },
      { status: 403 },
    );
  }

  let body: ApproveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, kind, action, reason } = body;
  if (!id || !kind || !action) {
    return NextResponse.json({ error: "Missing id, kind, or action" }, { status: 400 });
  }

  const existing = await findEntry(kind, id);
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (shouldAutoApproveEntry(existing.enteredBy.globalRole)) {
    return NextResponse.json(
      { error: "Business Head and Super Admin entries do not require approval" },
      { status: 400 },
    );
  }

  const plantId = "plantId" in existing ? existing.plantId : null;
  if (!plantId || !(await canAccessPlant(session.user.id, plantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "approve_head") {
    const updated = await updateEntry(kind, id, {
      approvedByHead: true,
      approvedByHeadId: session.user.id,
      approvedByAdmin: true,
      rejectedByHead: false,
      rejectionReason: null,
    });
    return NextResponse.json({ success: true, entry: updated });
  }

  if (action === "reject_head") {
    const updated = await updateEntry(kind, id, {
      rejectedByHead: true,
      approvedByHead: false,
      approvedByAdmin: false,
      rejectionReason: reason?.trim() || null,
    });
    return NextResponse.json({ success: true, entry: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
