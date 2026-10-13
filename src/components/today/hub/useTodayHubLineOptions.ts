import { useMemo } from "react";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import type { useTodayHubCatalogBases } from "@/components/today/hub/useTodayHubCatalogBases";
import type { useTodayHubCustomCatalogs } from "@/components/today/hub/useTodayHubCustomCatalogs";
import {
  buildPurchaseItemOptions,
  buildSaleItemOptions,
  buildStockParticulars,
} from "@/components/today/hub/build-catalog-options";

type CatalogBases = ReturnType<typeof useTodayHubCatalogBases>;
type CustomCatalogs = ReturnType<typeof useTodayHubCustomCatalogs>;

export function useTodayHubLineOptions(
  flags: TodayHubFlags,
  bases: CatalogBases,
  custom: CustomCatalogs,
) {
  const { goods, goodsByType, excludedCustomGoods } = bases.purchaseCatalog;
  const purchaseItemOptionsByType = useMemo(() => {
    if (!goodsByType) return {};
    const blocked = new Set(
      [...goods, ...(excludedCustomGoods ?? [])].map((x) => x.trim().toLowerCase()),
    );
    return Object.fromEntries(
      Object.entries(goodsByType).map(([type, list]) => {
        const customs = (custom.customPurchaseItemsByType[type] ?? []).filter(
          (x) => !blocked.has(x.trim().toLowerCase()),
        );
        return [type, buildPurchaseItemOptions(list ?? [], customs)];
      }),
    ) as Partial<Record<string, string[]>>;
  }, [goods, goodsByType, excludedCustomGoods, custom.customPurchaseItemsByType]);
  const purchaseItemOptions = useMemo(() => {
    if (!goodsByType) return buildPurchaseItemOptions(goods, custom.customPurchaseItems);
    const typed = Object.values(purchaseItemOptionsByType).flatMap((opts) => opts ?? []);
    return buildPurchaseItemOptions(goods, typed.filter((x) => !goods.includes(x)));
  }, [goods, goodsByType, custom.customPurchaseItems, purchaseItemOptionsByType]);
  const saleItemOptions = useMemo(
    () => buildSaleItemOptions(bases.saleProducts, custom.customSaleItems),
    [bases.saleProducts, custom.customSaleItems],
  );
  const stockParticulars = useMemo(
    () => buildStockParticulars(flags.isQuad, bases.stockCatalog.particulars, custom.customStockItems),
    [bases.stockCatalog.particulars, custom.customStockItems, flags.isQuad],
  );
  return { purchaseItemOptions, purchaseItemOptionsByType, saleItemOptions, stockParticulars };
}
