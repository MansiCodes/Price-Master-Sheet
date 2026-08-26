import { NextRequest, NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import {
  canAccessPlant,
  canAdminMachineProduction,
  canEnterData,
  canEnterMachineProduction,
  canAccessMachineProduction,
} from "@/lib/rbac";

export type SessionUser = {
  id: string;
  email: string;
  globalRole: GlobalRole;
  canViewPriceSheet: boolean;
  canMachineSupervise: boolean;
  name?: string | null;
};

type MachineUserLike =
  | GlobalRole
  | Pick<SessionUser, "globalRole" | "canMachineSupervise">;

function asMachineOpts(userOrRole: MachineUserLike): {
  role: GlobalRole;
  opts: { canMachineSupervise?: boolean };
} {
  if (typeof userOrRole === "string") {
    return { role: userOrRole, opts: {} };
  }
  return {
    role: userOrRole.globalRole,
    opts: { canMachineSupervise: userOrRole.canMachineSupervise },
  };
}

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
      canMachineSupervise: Boolean(session.user.canMachineSupervise),
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

export function requireMachineProductionAccess(
  userOrRole: MachineUserLike,
): NextResponse | null {
  const { role, opts } = asMachineOpts(userOrRole);
  if (!canAccessMachineProduction(role, opts)) {
    return NextResponse.json(
      { error: "Forbidden — Machine Production access required" },
      { status: 403 },
    );
  }
  return null;
}

export function requireMachineProductionEnter(
  userOrRole: MachineUserLike,
): NextResponse | null {
  const { role, opts } = asMachineOpts(userOrRole);
  if (!canEnterMachineProduction(role, opts)) {
    return NextResponse.json(
      { error: "Forbidden — Supervisor access required" },
      { status: 403 },
    );
  }
  return null;
}

export function requireMachineProductionAdmin(
  role: GlobalRole,
): NextResponse | null {
  if (!canAdminMachineProduction(role)) {
    return NextResponse.json(
      { error: "Forbidden — Admin access required" },
      { status: 403 },
    );
  }
  return null;
}

/** Plant P&L data entry or Machine Production supervisor/admin. */
export function requireCanEnterOrMachineProduction(
  userOrRole: MachineUserLike,
): NextResponse | null {
  const { role, opts } = asMachineOpts(userOrRole);
  if (canEnterData(role) || canEnterMachineProduction(role, opts)) return null;
  return NextResponse.json(
    { error: "You cannot upload files with this role" },
    { status: 403 },
  );
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isDeleteConfirmed(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

/** Rejects DELETE unless the client sends confirm=true after the user chooses Yes. */
export async function requireDeleteConfirmation(
  request: NextRequest,
): Promise<NextResponse | null> {
  const fromQuery = request.nextUrl.searchParams.get("confirm");
  let fromBody: unknown = false;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const json = (await request.json()) as { confirm?: unknown };
      fromBody = json?.confirm;
    } catch {
      fromBody = false;
    }
  }
  if (isDeleteConfirmed(fromQuery) || isDeleteConfirmed(fromBody)) {
    return null;
  }
  return jsonError(
    "Delete was not confirmed. Choose Yes to delete this data.",
    400,
  );
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
