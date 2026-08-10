import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { canAccessPlant, canEnterData } from "@/lib/rbac";

export type SessionUser = {
  id: string;
  email: string;
  globalRole: GlobalRole;
  canViewPriceSheet: boolean;
  name?: string | null;
};

export async function requireSession(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      globalRole: session.user.globalRole,
      canViewPriceSheet: session.user.canViewPriceSheet,
      name: session.user.name,
    },
  };
}

export async function requirePlantAccess(
  userId: string,
  plantId: string,
): Promise<NextResponse | null> {
  const allowed = await canAccessPlant(userId, plantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireCanEnter(
  role: GlobalRole,
): NextResponse | null {
  if (!canEnterData(role)) {
    return NextResponse.json(
      { error: "Viewers cannot enter data" },
      { status: 403 },
    );
  }
  return null;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function zodErrorResponse(error: {
  flatten: () => unknown;
  issues?: unknown;
}) {
  return NextResponse.json(
    { error: "Validation failed", details: error.flatten() },
    { status: 400 },
  );
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
