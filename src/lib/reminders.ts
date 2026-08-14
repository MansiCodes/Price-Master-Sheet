import { GlobalRole } from "@prisma/client";
import {
  isPastNinePmIst,
  startOfUtcDay,
  todayIstAsUtcDate,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  isAisensyReminderConfigured,
  sendShiftReminderWhatsApp,
} from "@/lib/aisensy";
import { toIndiaPhoneE164 } from "@/lib/phone";

const AUDIENCES = ["accountant", "manager", "admin"] as const;
type Audience = (typeof AUDIENCES)[number];

type ReminderRecipient = {
  name: string;
  phone: string | null;
  email: string;
};

function formatReminderDate(day: Date): string {
  return day.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function alreadyLogged(
  plantId: string,
  date: Date,
  audience: Audience,
  shift: "DAY" | "NIGHT",
): Promise<boolean> {
  const existing = await prisma.reminderLog.findFirst({
    where: {
      plantId,
      date,
      audience,
      message: { contains: shift === "DAY" ? "Day shift" : "Night shift" },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * After 9PM IST cutoff: for each active plant/shift whose status is not
 * allComplete, send AiSensy shift-reminder WhatsApp (when configured) and
 * write ReminderLog entries.
 */
export async function runDailyReminders(now: Date = new Date()) {
  const day = todayIstAsUtcDate(now);
  const dateLabel = formatReminderDate(day);
  const isoDate = day.toISOString().slice(0, 10);

  if (!isPastNinePmIst(now)) {
    return {
      skipped: true as const,
      reason: "before_cutoff",
      date: isoDate,
      remindersCreated: 0,
      whatsappSent: 0,
    };
  }

  const whatsappReady = await isAisensyReminderConfigured();
  const plants = await prisma.plant.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let remindersCreated = 0;
  let whatsappSent = 0;
  const shifts = ["DAY", "NIGHT"] as const;

  for (const plant of plants) {
    for (const shift of shifts) {
      const status = await prisma.dailyEntryStatus.findUnique({
        where: {
          plantId_date_shift: {
            plantId: plant.id,
            date: startOfUtcDay(day),
            shift,
          },
        },
      });

      if (status?.allComplete) continue;

      const shiftLabel = shift === "DAY" ? "Day" : "Night";

      for (const audience of AUDIENCES) {
        if (await alreadyLogged(plant.id, day, audience, shift)) continue;

        const recipients = await resolveAudienceRecipients(plant.id, audience);
        const sendResults: string[] = [];

        for (const recipient of recipients) {
          const displayName =
            recipient.name.trim() || recipient.email.split("@")[0] || "there";

          if (whatsappReady && recipient.phone) {
            const result = await sendShiftReminderWhatsApp({
              destination: recipient.phone,
              userName: displayName,
              shiftLabel,
              plantName: plant.name,
              dateLabel,
            });
            if (result.ok) {
              whatsappSent += 1;
              sendResults.push(`${recipient.phone}: sent`);
            } else {
              sendResults.push(
                `${recipient.phone}: failed (${result.message ?? "error"})`,
              );
            }
          } else if (!recipient.phone) {
            sendResults.push(`${recipient.email}: no phone`);
          } else {
            sendResults.push(`${recipient.phone}: stub (campaign not configured)`);
          }
        }

        const channel =
          whatsappReady && recipients.some((r) => r.phone)
            ? "whatsapp"
            : "in_app";

        const summary =
          sendResults.length > 0
            ? sendResults.join("; ")
            : `no ${audience} recipients found`;

        const message = `${shiftLabel} shift reminder for ${plant.name} on ${dateLabel}. ${summary}`;

        await prisma.reminderLog.create({
          data: {
            plantId: plant.id,
            date: day,
            channel,
            audience,
            message,
          },
        });
        remindersCreated += 1;
        console.log(`[reminders] ${audience} plant=${plant.id} ${shift}: ${message}`);
      }
    }
  }

  return {
    skipped: false as const,
    date: isoDate,
    remindersCreated,
    whatsappSent,
  };
}

async function resolveAudienceRecipients(
  plantId: string,
  audience: Audience,
): Promise<ReminderRecipient[]> {
  if (audience === "admin") {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        globalRole: {
          in: [GlobalRole.SUPER_ADMIN, GlobalRole.BUSINESS_HEAD],
        },
      },
      select: { name: true, email: true, phone: true },
    });
    return admins.map((u) => ({
      name: u.name ?? "",
      email: u.email,
      phone: u.phone ? toIndiaPhoneE164(u.phone) : null,
    }));
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
    select: { name: true, email: true, phone: true },
  });

  return users.map((u) => ({
    name: u.name ?? "",
    email: u.email,
    phone: u.phone ? toIndiaPhoneE164(u.phone) : null,
  }));
}
