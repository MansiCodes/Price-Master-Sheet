import { ninePmIstOnDate, startOfUtcDay } from "@/lib/dates";
import { prisma } from "@/lib/db";

const COINS_AWARD = 100;
const COINS_REASON = "Daily entry completed before 9PM IST";

export type AwardCoinsResult =
  | { awarded: false; reason: string }
  | {
      awarded: true;
      userId: string;
      amount: number;
      ledgerId: string;
    };

/**
 * Award +100 coins to the plant accountant when daily entry is complete
 * before 9PM IST and coins have not already been awarded.
 */
export async function awardCoinsIfEligible(
  plantId: string,
  date: Date,
): Promise<AwardCoinsResult> {
  const day = startOfUtcDay(date);

  const status = await prisma.dailyEntryStatus.findUnique({
    where: { plantId_date: { plantId, date: day } },
  });

  if (!status) {
    return { awarded: false, reason: "no_status" };
  }
  if (!status.allComplete) {
    return { awarded: false, reason: "not_complete" };
  }
  if (status.coinsAwarded) {
    return { awarded: false, reason: "already_awarded" };
  }
  if (!status.accountantId) {
    return { awarded: false, reason: "no_accountant" };
  }
  if (!status.completedAt) {
    return { awarded: false, reason: "no_completed_at" };
  }

  const cutoff = ninePmIstOnDate(day);
  if (status.completedAt.getTime() >= cutoff.getTime()) {
    return { awarded: false, reason: "after_cutoff" };
  }

  const accountantId = status.accountantId;

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.dailyEntryStatus.findUnique({
      where: { id: status.id },
    });
    if (!locked || locked.coinsAwarded || !locked.allComplete) {
      return null;
    }

    await tx.user.update({
      where: { id: accountantId },
      data: { coinsBalance: { increment: COINS_AWARD } },
    });

    const ledger = await tx.coinsLedger.create({
      data: {
        userId: accountantId,
        plantId,
        date: day,
        amount: COINS_AWARD,
        reason: COINS_REASON,
      },
    });

    await tx.dailyEntryStatus.update({
      where: { id: status.id },
      data: { coinsAwarded: true },
    });

    return ledger;
  });

  if (!result) {
    return { awarded: false, reason: "race_skipped" };
  }

  return {
    awarded: true,
    userId: accountantId,
    amount: COINS_AWARD,
    ledgerId: result.id,
  };
}
