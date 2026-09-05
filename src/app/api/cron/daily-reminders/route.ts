import { NextResponse } from "next/server";
import { awardCoinsForDate } from "@/lib/coins";
import {
  getIstHoursMinutes,
  isPastNinePmIst,
  reminderShiftForNow,
  todayIstAsUtcDate,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { runDailyReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/daily-reminders] CRON_SECRET is not set");
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  return header.slice("Bearer ".length).trim() === secret;
}

async function handleCron(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();
  const ist = getIstHoursMinutes(now);
  const detected = reminderShiftForNow(now);
  console.log(
    `[cron/daily-reminders] nowUtc=${now.toISOString()} ist=${String(ist.hour).padStart(2, "0")}:${String(ist.minute).padStart(2, "0")} shift=${detected ?? "none"}`,
  );

  const day = todayIstAsUtcDate(now);
  const reminders = await runDailyReminders(now);

  const coins = [];
  if (isPastNinePmIst(now)) {
    const plants = await prisma.plant.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    for (const plant of plants) {
      coins.push({
        plantId: plant.id,
        ...(await awardCoinsForDate(plant.id, day)),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    date: day.toISOString().slice(0, 10),
    istTime: `${String(ist.hour).padStart(2, "0")}:${String(ist.minute).padStart(2, "0")}`,
    detectedShift: detected,
    reminders,
    coins,
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
