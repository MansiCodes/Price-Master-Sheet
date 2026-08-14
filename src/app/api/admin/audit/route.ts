import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { queryAuditLogs } from "@/lib/audit";
import { isAdminOrHead } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  if (!isAdminOrHead(session.user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const result = await queryAuditLogs({
    page: Number(sp.get("page") || 1),
    pageSize: Number(sp.get("pageSize") || 10),
    q: sp.get("q") ?? undefined,
    actorName: sp.get("actor") ?? undefined,
    dateFrom: sp.get("dateFrom") ?? undefined,
    dateTo: sp.get("dateTo") ?? undefined,
  });

  return NextResponse.json(result);
}
