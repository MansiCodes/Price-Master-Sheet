import { fetchStockPurchaseRate } from "@/components/today/today-hub-model";
import type { EntryKind } from "@/components/today/today-hub-model";

export function startStockPurchaseRateLoad(args: {
  kind: EntryKind;
  resolvedStockItemName: string;
  entryDate: string;
  plantId: string;
  setStockPurchaseRate: (rate: number | null) => void;
  setStockPurchaseRateLoading: (loading: boolean) => void;
  setStockRate: (rate: string) => void;
}) {
  if (args.kind !== "stock") {
    args.setStockPurchaseRate(null);
    args.setStockPurchaseRateLoading(false);
    return () => {};
  }
  if (!args.resolvedStockItemName || !args.entryDate) {
    args.setStockPurchaseRate(null);
    return () => {};
  }
  let cancelled = false;
  args.setStockPurchaseRateLoading(true);
  void applyFetchedRate(args, () => cancelled);
  return () => {
    cancelled = true;
  };
}

async function applyFetchedRate(
  args: {
    plantId: string;
    resolvedStockItemName: string;
    entryDate: string;
    setStockPurchaseRate: (rate: number | null) => void;
    setStockPurchaseRateLoading: (loading: boolean) => void;
    setStockRate: (rate: string) => void;
  },
  isCancelled: () => boolean,
) {
  try {
    const rate = await fetchStockPurchaseRate(args.plantId, args.resolvedStockItemName, args.entryDate);
    if (isCancelled()) return;
    args.setStockPurchaseRate(rate);
    if (rate != null) args.setStockRate(String(rate));
  } catch {
    if (!isCancelled()) args.setStockPurchaseRate(null);
  } finally {
    if (!isCancelled()) args.setStockPurchaseRateLoading(false);
  }
}
