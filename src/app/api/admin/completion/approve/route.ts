import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/api";
import { canApproveEntries } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  if (!canApproveEntries(session.user.globalRole)) {
    return NextResponse.json(
      { error: "Only Super Admin can approve shifts" },
      { status: 403 },
    );
  }

  let body: {
    id: string;
    action: "approve_head" | "approve_admin" | "reject_head" | "reject_admin";
    reason?: string;
  };
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

  if (action === "approve_head" || action === "approve_admin") {
    const updated = await prisma.dailyEntryStatus.update({
      where: { id },
      data: {
        approvedByHead: true,
        approvedByHeadId: session.user.id,
        approvedByAdmin: true,
        approvedByAdminId: session.user.id,
        rejectedByHead: false,
        rejectedByAdmin: false,
        rejectionReason: null,
      },
    });
    return NextResponse.json({ success: true, status: updated });
  }

  if (action === "reject_head" || action === "reject_admin") {
    const updated = await prisma.dailyEntryStatus.update({
      where: { id },
      data: {
        rejectedByHead: true,
        rejectedByAdmin: true,
        approvedByHead: false,
        approvedByAdmin: false,
        allComplete: false,
        rejectionReason: reason || null,
      },
    });
    return NextResponse.json({ success: true, status: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
