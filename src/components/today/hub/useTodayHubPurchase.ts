import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import { useTodayHubPurchaseFields } from "@/components/today/hub/useTodayHubPurchaseFields";
import {
  useQuadSelectedMaterial,
  useQuadSupplierOptions,
  useQuadVendorReset,
} from "@/components/today/hub/useTodayHubPurchaseQuad";

export function useTodayHubPurchase(
  plantCode: string,
  flags: TodayHubFlags,
  catalogs: TodayHubCatalogs,
) {
  const fields = useTodayHubPurchaseFields(plantCode);
  const quadSelectedMaterial = useQuadSelectedMaterial(fields.purchaseLines);
  const quadSupplierOptions = useQuadSupplierOptions(quadSelectedMaterial, catalogs.customSuppliers);
  useQuadVendorReset(
    flags.isQuad, quadSelectedMaterial, quadSupplierOptions,
    fields.vendorName, fields.setVendorName, fields.setVendorNameOther,
  );
  const purchaseSupplierOptions = flags.isQuad ? quadSupplierOptions : catalogs.cat6SupplierOptions;
  return { ...fields, quadSelectedMaterial, quadSupplierOptions, purchaseSupplierOptions };
}

export type TodayHubPurchase = ReturnType<typeof useTodayHubPurchase>;
