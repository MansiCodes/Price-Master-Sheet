import { useMemo } from "react";
import {
  getCat6PettyCatalog,
  getCustomerCatalog,
  getPurchaseCatalog,
  getSalesCatalog,
  getStockCatalog,
} from "@/lib/plant-catalogs";

export function useTodayHubCatalogBases(plantCode: string) {
  const purchaseCatalog = useMemo(
    () => getPurchaseCatalog(plantCode),
    [plantCode],
  );
  const stockCatalog = useMemo(
    () => getStockCatalog(plantCode),
    [plantCode],
  );
  const saleProducts = useMemo(() => getSalesCatalog(plantCode), [plantCode]);
  const customers = useMemo(() => getCustomerCatalog(plantCode), [plantCode]);
  const pettyCatalog = useMemo(() => getCat6PettyCatalog(), []);
  return { purchaseCatalog, stockCatalog, saleProducts, customers, pettyCatalog };
}
