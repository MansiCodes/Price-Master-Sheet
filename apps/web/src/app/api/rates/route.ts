import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { canViewPriceSheet } from "@/lib/rbac";
import { getAllRates, SheetsError } from "@/lib/sheets";

function mayAccessRates(user: {
  globalRole: GlobalRole;
  canViewPriceSheet: boolean;
}): boolean {
  return (
    user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user)
  );
}

export async function GET() {
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
    const data = await getAllRates();
    return NextResponse.json({
      success: true,
      message: "Rates fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof SheetsError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch rates" },
      { status: 502 },
    );
  }
}
