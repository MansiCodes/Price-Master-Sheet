import type { ManpowerShift } from "@prisma/client";
import { GlobalRole } from "@prisma/client";
import { startOfUtcDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { sendFormsCompleteWhatsApp } from "@/lib/aisensy";
import { toIndiaPhoneE164 } from "@/lib/phone";

/** Points added each time a user completes all five forms for one plant/date/shift. */
export const CREDIT_SCORE_COMPLETE = 100;

function formatCompleteDate(date: Date): string {
  return startOfUtcDay(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** True when the user has at least one entry in ANY daily form for plant/date/shift. */
export async function userShiftFormsComplete(
  userId: string,
  plantId: string,
  date: Date,
  shift: ManpowerShift,
): Promise<boolean> {
  const day = startOfUtcDay(date);
  const where = { plantId, date: day, shift, enteredById: userId };

  const [purchaseN, saleN, stockN, productionN, expenseN] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.sale.count({ where }),
    prisma.stockEntry.count({ where }),
    prisma.productionEntry.count({ where }),
    prisma.pettyCashEntry.count({ where }),
  ]);

  return (
    purchaseN > 0 ||
    saleN > 0 ||
    stockN > 0 ||
    productionN > 0 ||
    expenseN > 0
  );
}

/** True when any form is done in at least one shift for the day. */
export async function userDailyFormsComplete(
  userId: string,
  plantId: string,
  date: Date,
): Promise<boolean> {
  const [dayComplete, nightComplete] = await Promise.all([
    userShiftFormsComplete(userId, plantId, date, "DAY"),
    userShiftFormsComplete(userId, plantId, date, "NIGHT"),
  ]);
  return dayComplete || nightComplete;
}

async function seedLegacyCreditAwards(
  userId: string,
  creditScore: number,
): Promise<void> {
  if (creditScore < CREDIT_SCORE_COMPLETE) return;

  const existing = await prisma.creditScoreAward.count({ where: { userId } });
  if (existing > 0) return;

  const slots = Math.floor(creditScore / CREDIT_SCORE_COMPLETE);
  const purchases = await prisma.purchase.findMany({
    where: { enteredById: userId },
    select: { plantId: true, date: true, shift: true },
    orderBy: [{ date: "asc" }, { shift: "asc" }],
    distinct: ["plantId", "date", "shift"],
  });

  let created = 0;
  for (const row of purchases) {
    if (created >= slots) break;
    const complete = await userShiftFormsComplete(
      userId,
      row.plantId,
      row.date,
      row.shift,
    );
    if (!complete) continue;
    try {
      await prisma.creditScoreAward.create({
        data: {
          userId,
          plantId: row.plantId,
          date: startOfUtcDay(row.date),
          shift: row.shift,
          points: CREDIT_SCORE_COMPLETE,
        },
      });
      created += 1;
    } catch {
      // ignore unique conflicts
    }
  }
}

async function awardShiftCreditScore(
  userId: string,
  plantId: string,
  date: Date,
  shift: ManpowerShift,
): Promise<{ awarded: boolean; whatsappSent?: boolean; newScore?: number }> {
  const day = startOfUtcDay(date);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      globalRole: true,
      creditScore: true,
      name: true,
      email: true,
      phone: true,
    },
  });

  if (!user || user.globalRole === GlobalRole.SUPER_ADMIN) {
    return { awarded: false };
  }

  await seedLegacyCreditAwards(userId, user.creditScore ?? 0);

  const complete = await userShiftFormsComplete(userId, plantId, day, shift);
  if (!complete) {
    return { awarded: false };
  }

  const existing = await prisma.creditScoreAward.findUnique({
    where: {
      userId_plantId_date_shift: {
        userId,
        plantId,
        date: day,
        shift,
      },
    },
    select: { id: true, whatsappSentAt: true },
  });

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { name: true },
  });

  const phone = user.phone ? toIndiaPhoneE164(user.phone) : null;
  const displayName =
    user.name?.trim() || user.email.split("@")[0] || "there";

  async function sendCreditWhatsApp(score: number): Promise<boolean> {
    if (!phone || !plant) {
      console.warn(
        `[credit-score] skipped WhatsApp (phone=${Boolean(phone)} plant=${Boolean(plant)}) user=${userId}`,
      );
      return false;
    }

    const result = await sendFormsCompleteWhatsApp({
      destination: phone,
      userName: displayName,
      plantName: plant.name,
      dateLabel: formatCompleteDate(day),
      creditScore: score,
    });

    if (!result.ok) {
      console.warn(
        `[credit-score] WhatsApp forms-complete failed for user=${userId}: ${result.message}`,
      );
      return false;
    }

    console.log(
      `[credit-score] WhatsApp forms-complete sent user=${userId} score=${score}`,
    );
    return true;
  }

  if (existing) {
    if (!existing.whatsappSentAt) {
      const currentScore = user.creditScore ?? 0;
      const sent = await sendCreditWhatsApp(currentScore);
      if (sent) {
        await prisma.creditScoreAward.update({
          where: { id: existing.id },
          data: { whatsappSentAt: new Date() },
        });
        return { awarded: false, whatsappSent: true, newScore: currentScore };
      }
    }
    return { awarded: false };
  }

  const nextScore = (user.creditScore ?? 0) + CREDIT_SCORE_COMPLETE;

  try {
    await prisma.$transaction([
      prisma.creditScoreAward.create({
        data: {
          userId,
          plantId,
          date: day,
          shift,
          points: CREDIT_SCORE_COMPLETE,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { creditScore: nextScore },
      }),
    ]);
  } catch (err) {
    console.warn("[credit-score] award race or error", err);
    return { awarded: false };
  }

  const whatsappSent = await sendCreditWhatsApp(nextScore);
  if (whatsappSent) {
    await prisma.creditScoreAward.update({
      where: {
        userId_plantId_date_shift: {
          userId,
          plantId,
          date: day,
          shift,
        },
      },
      data: { whatsappSentAt: new Date() },
    });
  }

  return { awarded: true, whatsappSent, newScore: nextScore };
}

/**
 * Revoke the +100 credit award for a plant/date/shift when all forms for
 * that shift are deleted. Deducts 100 from the user's score and removes
 * the CreditScoreAward row. Does nothing if any form entry still exists.
 */
export async function maybeRevokeCreditScore(
  userId: string,
  plantId: string,
  date: Date,
  shift: ManpowerShift,
): Promise<{ revoked: boolean }> {
  const day = startOfUtcDay(date);

  // Check if an award exists for this slot
  const award = await prisma.creditScoreAward.findUnique({
    where: { userId_plantId_date_shift: { userId, plantId, date: day, shift } },
    select: { id: true, points: true },
  });
  if (!award) return { revoked: false };

  // If any form entry still exists, keep the award
  const stillComplete = await userShiftFormsComplete(userId, plantId, day, shift);
  if (stillComplete) return { revoked: false };

  // All entries for this shift are gone — revoke
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditScore: true },
  });
  const currentScore = user?.creditScore ?? 0;
  const newScore = Math.max(0, currentScore - (award.points ?? CREDIT_SCORE_COMPLETE));

  try {
    await prisma.$transaction([
      prisma.creditScoreAward.delete({ where: { id: award.id } }),
      prisma.user.update({ where: { id: userId }, data: { creditScore: newScore } }),
    ]);
  } catch (err) {
    console.warn("[credit-score] revoke error", err);
    return { revoked: false };
  }

  console.log(`[credit-score] revoked award user=${userId} shift=${shift} newScore=${newScore}`);
  return { revoked: true };
}

/**
 * Add +100 credit when a non–Super Admin fills ANY form for a
 * plant/date/shift. Awards once per shift; score accumulates (100, 200, …).
 * Sends forms-complete WhatsApp on each new award.
 */
export async function maybeAwardCreditScore(
  userId: string,
  plantId: string,
  date: Date,
  shift?: ManpowerShift,
): Promise<{ awarded: boolean; whatsappSent?: boolean; newScore?: number }> {
  if (shift) {
    return awardShiftCreditScore(userId, plantId, date, shift);
  }

  const dayResult = await awardShiftCreditScore(userId, plantId, date, "DAY");
  if (dayResult.awarded) return dayResult;
  return awardShiftCreditScore(userId, plantId, date, "NIGHT");
}
