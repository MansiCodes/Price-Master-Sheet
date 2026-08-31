import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/api";
import { GlobalRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const role = session.user.globalRole;
  if (role !== GlobalRole.SUPER_ADMIN && role !== GlobalRole.BUSINESS_HEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id: string; action: "approve_head" | "approve_admin" | "reject_head" | "reject_admin"; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, action, reason } = body;
  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const existing = await prisma.dailyEntryStatus.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Shift status not found" }, { status: 404 });
  }

  if (action === "approve_head") {
    if (role !== GlobalRole.BUSINESS_HEAD && role !== GlobalRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Only Plant Head can approve at this level" }, { status: 403 });
    }
    const updated = await prisma.dailyEntryStatus.update({
      where: { id },
      data: {
        approvedByHead: true,
        approvedByHeadId: session.user.id,
        rejectedByHead: false,
      },
    });
    return NextResponse.json({ success: true, status: updated });
  }

  if (action === "reject_head") {
    if (role !== GlobalRole.BUSINESS_HEAD && role !== GlobalRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Only Plant Head can reject at this level" }, { status: 403 });
    }
    const updated = await prisma.dailyEntryStatus.update({
      where: { id },
      data: {
        rejectedByHead: true,
        approvedByHead: false,
        allComplete: false,
        rejectionReason: reason || null,
      },
    });
    return NextResponse.json({ success: true, status: updated });
  }

  if (action === "approve_admin") {
    if (role !== GlobalRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Only Super Admin can approve at this level" }, { status: 403 });
    }
    if (!existing.approvedByHead) {
      return NextResponse.json({ error: "Must be approved by Plant Head first" }, { status: 400 });
    }
    const updated = await prisma.dailyEntryStatus.update({
      where: { id },
      data: {
        approvedByAdmin: true,
        approvedByAdminId: session.user.id,
        rejectedByAdmin: false,
      },
    });
    return NextResponse.json({ success: true, status: updated });
  }

  if (action === "reject_admin") {
    if (role !== GlobalRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Only Super Admin can reject at this level" }, { status: 403 });
    }
    const updated = await prisma.dailyEntryStatus.update({
      where: { id },
      data: {
        rejectedByAdmin: true,
        approvedByAdmin: false,
        approvedByHead: false,
        allComplete: false,
        rejectionReason: reason || null,
      },
    });
    return NextResponse.json({ success: true, status: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
