import { useMemo } from "react";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import type { useTodayHubCatalogBases } from "@/components/today/hub/useTodayHubCatalogBases";
import type { useTodayHubCustomCatalogs } from "@/components/today/hub/useTodayHubCustomCatalogs";
import {
  buildPurchaseUnitOptions,
  buildSaleUnitOptions,
  buildStockUnitOptions,
} from "@/components/today/hub/build-catalog-options";

type CatalogBases = ReturnType<typeof useTodayHubCatalogBases>;
type CustomCatalogs = ReturnType<typeof useTodayHubCustomCatalogs>;

export function useTodayHubUnitOptions(
  flags: TodayHubFlags,
  bases: CatalogBases,
  custom: CustomCatalogs,
) {
  const { isCat6, isPvc } = flags;
  const purchaseUnitOptions = useMemo(
    () => buildPurchaseUnitOptions(isCat6, custom.customUnits),
    [isCat6, custom.customUnits],
  );
  const saleUnitOptions = useMemo(
    () => buildSaleUnitOptions(isCat6, isPvc, custom.customUnits),
    [isCat6, isPvc, custom.customUnits],
  );
  const stockUnitOptions = useMemo(
    () => buildStockUnitOptions(bases.stockCatalog.units, custom.customUnits),
    [bases.stockCatalog.units, custom.customUnits],
  );
  return { purchaseUnitOptions, saleUnitOptions, stockUnitOptions };
}
