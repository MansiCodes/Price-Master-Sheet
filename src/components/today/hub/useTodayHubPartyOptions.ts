import { useMemo } from "react";
import type { useTodayHubCatalogBases } from "@/components/today/hub/useTodayHubCatalogBases";
import type { useTodayHubCustomCatalogs } from "@/components/today/hub/useTodayHubCustomCatalogs";
import {
  buildFarVendorOptions,
  buildSupplierOptions,
  buildCustomerOptions,
} from "@/components/today/hub/build-catalog-options";

type CatalogBases = ReturnType<typeof useTodayHubCatalogBases>;
type CustomCatalogs = ReturnType<typeof useTodayHubCustomCatalogs>;

export function useTodayHubPartyOptions(bases: CatalogBases, custom: CustomCatalogs) {
  const farVendorOptions = useMemo(
    () => buildFarVendorOptions(custom.customFarVendors),
    [custom.customFarVendors],
  );
  const cat6SupplierOptions = useMemo(
    () => buildSupplierOptions(bases.purchaseCatalog.suppliers, custom.customSuppliers),
    [bases.purchaseCatalog.suppliers, custom.customSuppliers],
  );
  const cat6CustomerOptions = useMemo(
    () => buildCustomerOptions(bases.customers, custom.customCustomers),
    [bases.customers, custom.customCustomers],
  );
  return { farVendorOptions, cat6SupplierOptions, cat6CustomerOptions };
}
