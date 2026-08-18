import { NextResponse } from "next/server";
import { awardCoinsForDate } from "@/lib/coins";
import { isPastNinePmIst, todayIstAsUtcDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { runDailyReminders } from "@/lib/reminders";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  return header.slice("Bearer ".length) === secret;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const day = todayIstAsUtcDate();
  const reminders = await runDailyReminders();

  const coins = [];
  if (isPastNinePmIst()) {
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
    reminders,
    coins,
  });
}
