import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/api";
import { getAccessiblePlantIds } from "@/lib/rbac";

export async function GET() {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const ids = await getAccessiblePlantIds(session.user.id);
  if (ids.length === 0) {
    return NextResponse.json({ plants: [] });
  }

  const plants = await prisma.plant.findMany({
    where: { id: { in: ids }, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  });

  return NextResponse.json({ plants });
}
