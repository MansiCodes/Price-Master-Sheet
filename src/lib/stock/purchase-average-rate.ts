import { prisma } from "@/lib/db";
import { round4 } from "@/lib/api";

export type PurchaseAverageRate = {
  rate: number;
  purchaseCount: number;
  totalQuantity: number;
};

/** Weighted average purchase rate for an item up to (and including) `asOf`. */
export async function weightedAveragePurchaseRate(
  plantId: string,
  itemName: string,
  asOf: Date,
): Promise<PurchaseAverageRate | null> {
  const trimmed = itemName.trim();
  if (!trimmed) return null;

  const purchases = await prisma.purchase.findMany({
    where: {
      plantId,
      date: { lte: asOf },
      OR: [
        { itemDescription: { equals: trimmed, mode: "insensitive" } },
        { itemDescription: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      quantity: true,
      rate: true,
      debitQuantity: true,
    },
  });

  let totalQuantity = 0;
  let totalValue = 0;
  for (const row of purchases) {
    const qty =
      Number(row.quantity) - Number(row.debitQuantity ?? 0);
    const rate = Number(row.rate);
    if (!(qty > 0) || !(rate >= 0)) continue;
    totalQuantity += qty;
    totalValue += qty * rate;
  }

  if (!(totalQuantity > 0)) return null;

  return {
    rate: round4(totalValue / totalQuantity),
    purchaseCount: purchases.length,
    totalQuantity: round4(totalQuantity),
  };
}
