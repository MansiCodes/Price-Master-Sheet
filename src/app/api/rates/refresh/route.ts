import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { canViewPriceSheet } from "@/lib/rbac";
import { refreshRatesCache, SheetsError } from "@/lib/sheets";

function mayAccessRates(user: {
  globalRole: GlobalRole;
  canViewPriceSheet: boolean;
}): boolean {
  return (
    user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user)
  );
}

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!mayAccessRates(session.user)) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const result = await refreshRatesCache();
    return NextResponse.json({
      success: true,
      message: "Cache refreshed successfully",
      data: {
        count: result.count,
        lastRefreshTime: result.lastRefreshTime,
      },
    });
  } catch (error) {
    if (error instanceof SheetsError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to refresh cache" },
      { status: 502 },
    );
  }
}
