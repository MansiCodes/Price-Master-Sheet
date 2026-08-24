import { GlobalRole, Prisma } from "@prisma/client";
import {
  getIstHoursMinutes,
  reminderShiftForNow,
  startOfUtcDay,
  todayIstAsUtcDate,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  isAisensyReminderConfigured,
  sendShiftReminderWhatsApp,
} from "@/lib/aisensy";
import { toIndiaPhoneE164 } from "@/lib/phone";

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

function reminderClaimId(
  plantId: string,
  isoDate: string,
  shift: "DAY" | "NIGHT",
): string {
  return `shift-reminder:${plantId}:${isoDate}:${shift}`;
}

function uniqueRecipients(
  recipients: ReminderRecipient[],
): ReminderRecipient[] {
  const seen = new Set<string>();
  const unique: ReminderRecipient[] = [];
  for (const recipient of recipients) {
    const phone = recipient.phone?.replace(/\D/g, "") ?? "";
    const key = phone || recipient.email.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(recipient);
  }
  return unique;
}

/**
 * Send one WhatsApp per person for the upcoming Day (08:50 AM) or Night (08:50 PM) shift.
 */
export async function runDailyReminders(now: Date = new Date()) {
  const day = todayIstAsUtcDate(now);
  const dateLabel = formatReminderDate(day);
  const isoDate = day.toISOString().slice(0, 10);
  const shift = reminderShiftForNow(now);

  if (!shift) {
    const { hour, minute } = getIstHoursMinutes(now);
    console.log(
      `[reminders] Skipped: outside shift window (utc=${now.toISOString()} ist=${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")})`,
    );
    return {
      skipped: true as const,
      reason: "outside_shift_reminder_window",
      date: isoDate,
      istTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      remindersCreated: 0,
      whatsappSent: 0,
    };
  }

  console.log(`[reminders] Running ${shift} shift reminders for ${isoDate}`);

  const whatsappReady = await isAisensyReminderConfigured();
  const plants = await prisma.plant.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let remindersCreated = 0;
  let whatsappSent = 0;
  const shiftLabel = shift === "DAY" ? "Day" : "Night";

  for (const plant of plants) {
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

    const claimed = await claimReminder(plant.id, day, isoDate, shift);
    if (!claimed) continue;

    const recipients = uniqueRecipients(
      await resolvePlantRecipients(plant.id),
    );
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
        : "no recipients found";
    const message = `${shiftLabel} shift reminder for ${plant.name} on ${dateLabel}. ${summary}`;

    await prisma.reminderLog.update({
      where: { id: claimed.id },
      data: { channel, message },
    });
    remindersCreated += 1;
    console.log(`[reminders] plant=${plant.id} ${shift}: ${message}`);
  }

  return {
    skipped: false as const,
    date: isoDate,
    shift,
    remindersCreated,
    whatsappSent,
  };
}

async function claimReminder(
  plantId: string,
  date: Date,
  isoDate: string,
  shift: "DAY" | "NIGHT",
) {
  const id = reminderClaimId(plantId, isoDate, shift);
  try {
    return await prisma.reminderLog.create({
      data: {
        id,
        plantId,
        date,
        channel: "pending",
        audience: "plant",
        message: `${shift} reminder claimed`,
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

async function resolvePlantRecipients(
  plantId: string,
): Promise<ReminderRecipient[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      NOT: { globalRole: GlobalRole.SUPER_ADMIN },
      OR: [
        { globalRole: GlobalRole.BUSINESS_HEAD },
        { plantRoles: { some: { plantId } } },
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
