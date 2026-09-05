import { prisma } from "@/lib/db";
import { round4 } from "@/lib/api";
import { isAtclPurchase } from "@/lib/plant-catalogs";

export type PurchaseAverageRate = {
  rate: number;
  purchaseCount: number;
  totalQuantity: number;
};

function normalizeItemName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when stock item and purchase line describe the same material. */
export function purchaseItemMatchesStock(
  stockItemName: string,
  purchaseDescription: string,
): boolean {
  const stock = normalizeItemName(stockItemName);
  const purchase = normalizeItemName(purchaseDescription);
  if (!stock || !purchase) return false;
  if (stock === purchase) return true;
  if (stock.includes(purchase) || purchase.includes(stock)) return true;

  const stockTokens = stock.split(" ").filter((t) => t.length > 2);
  const purchaseTokens = purchase.split(" ").filter((t) => t.length > 2);
  if (stockTokens.length === 0 || purchaseTokens.length === 0) return false;

  const shared = stockTokens.filter((token) => purchase.includes(token));
  return shared.length >= Math.min(2, stockTokens.length);
}

/** Weighted average purchase rate for an item on or before `asOf` (any prior day). */
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
    },
    select: {
      itemDescription: true,
      quantity: true,
      rate: true,
      debitQuantity: true,
      vendorName: true,
      notes: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  let totalQuantity = 0;
  let totalValue = 0;
  let matchedCount = 0;

  for (const row of purchases) {
    if (isAtclPurchase(row)) continue;
    if (!purchaseItemMatchesStock(trimmed, row.itemDescription)) continue;

    const qty = Number(row.quantity) - Number(row.debitQuantity ?? 0);
    const rate = Number(row.rate);
    if (!(qty > 0) || !(rate >= 0)) continue;

    matchedCount += 1;
    totalQuantity += qty;
    totalValue += qty * rate;
  }

  if (!(totalQuantity > 0)) return null;

  return {
    rate: round4(totalValue / totalQuantity),
    purchaseCount: matchedCount,
    totalQuantity: round4(totalQuantity),
  };
}
