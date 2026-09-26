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
  const purchaseItemOptions = useMemo(
    () => buildPurchaseItemOptions(bases.purchaseCatalog.goods, custom.customPurchaseItems),
    [bases.purchaseCatalog.goods, custom.customPurchaseItems],
  );
  const saleItemOptions = useMemo(
    () => buildSaleItemOptions(bases.saleProducts, custom.customSaleItems),
    [bases.saleProducts, custom.customSaleItems],
  );
  const stockParticulars = useMemo(
    () => buildStockParticulars(flags.isQuad, bases.stockCatalog.particulars, custom.customStockItems),
    [bases.stockCatalog.particulars, custom.customStockItems, flags.isQuad],
  );
  return { purchaseItemOptions, saleItemOptions, stockParticulars };
}
