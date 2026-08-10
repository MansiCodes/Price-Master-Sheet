import { GlobalRole } from "@prisma/client";
import {
  isPastNinePmIst,
  startOfUtcDay,
  todayIstAsUtcDate,
} from "@/lib/dates";
import { prisma } from "@/lib/db";

const AUDIENCES = ["accountant", "manager", "admin"] as const;
type Audience = (typeof AUDIENCES)[number];

function stubWhatsAppMessage(plantName: string, dateLabel: string): string {
  return `[WhatsApp stub] Daily entry incomplete for ${plantName} on ${dateLabel}. Please complete purchases, sales, stock, manpower, and petty cash.`;
}

async function alreadyLogged(
  plantId: string,
  date: Date,
  audience: Audience,
): Promise<boolean> {
  const existing = await prisma.reminderLog.findFirst({
    where: { plantId, date, audience, channel: "in_app" },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * After 9PM IST cutoff: for each active plant whose today status is not
 * allComplete, create in-app ReminderLog entries (WhatsApp message stubbed).
 */
export async function runDailyReminders(now: Date = new Date()) {
  const day = todayIstAsUtcDate(now);
  const dateLabel = day.toISOString().slice(0, 10);

  if (!isPastNinePmIst(now)) {
    return {
      skipped: true as const,
      reason: "before_cutoff",
      date: dateLabel,
      remindersCreated: 0,
    };
  }

  const plants = await prisma.plant.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let remindersCreated = 0;

  for (const plant of plants) {
    const status = await prisma.dailyEntryStatus.findUnique({
      where: {
        plantId_date: { plantId: plant.id, date: startOfUtcDay(day) },
      },
    });

    if (status?.allComplete) continue;

    const message = stubWhatsAppMessage(plant.name, dateLabel);

    for (const audience of AUDIENCES) {
      if (await alreadyLogged(plant.id, day, audience)) continue;

      const recipients = await resolveAudiencePhones(plant.id, audience);
      const fullMessage =
        recipients.length > 0
          ? `${message} Recipients: ${recipients.join(", ")}`
          : `${message} (no ${audience} recipients found)`;

      await prisma.reminderLog.create({
        data: {
          plantId: plant.id,
          date: day,
          channel: "in_app",
          audience,
          message: fullMessage,
        },
      });
      remindersCreated += 1;
      console.log(`[reminders] ${audience} plant=${plant.id}: ${fullMessage}`);
    }
  }

  return {
    skipped: false as const,
    date: dateLabel,
    remindersCreated,
  };
}

async function resolveAudiencePhones(
  plantId: string,
  audience: Audience,
): Promise<string[]> {
  if (audience === "admin") {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        globalRole: {
          in: [GlobalRole.SUPER_ADMIN, GlobalRole.BUSINESS_HEAD],
        },
      },
      select: { email: true, phone: true },
    });
    return admins.map((u) => u.phone || u.email);
  }

  const role =
    audience === "accountant"
      ? GlobalRole.ACCOUNTANT
      : GlobalRole.PLANT_MANAGER;

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { globalRole: role, plantRoles: { some: { plantId } } },
        { plantRoles: { some: { plantId, role } } },
      ],
    },
    select: { email: true, phone: true },
  });

  return users.map((u) => u.phone || u.email);
}
