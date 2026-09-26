import { useEffect, useMemo } from "react";
import { getQuadVendorsForMaterial } from "@/lib/plant-catalogs";
import type { LineItem } from "@/components/today/today-hub-model";

export function useQuadSelectedMaterial(purchaseLines: LineItem[]) {
  return useMemo(() => {
    const desc = purchaseLines[0]?.itemDescription?.trim() ?? "";
    if (!desc || desc === "Other" || desc === "Others") return "";
    return desc;
  }, [purchaseLines]);
}

export function useQuadSupplierOptions(
  quadSelectedMaterial: string,
  customSuppliers: string[],
) {
  return useMemo(() => {
    if (!quadSelectedMaterial) return [];
    const base = getQuadVendorsForMaterial(quadSelectedMaterial).filter(
      (x) => x !== "Other" && x !== "Others",
    );
    const custom = customSuppliers.filter((x) => x !== "Other" && x !== "Others");
    return Array.from(new Set([...base, ...custom, "Other"]));
  }, [quadSelectedMaterial, customSuppliers]);
}

export function useQuadVendorReset(
  isQuad: boolean,
  quadSelectedMaterial: string,
  quadSupplierOptions: string[],
  vendorName: string,
  setVendorName: (name: string) => void,
  setVendorNameOther: (name: string) => void,
) {
  useEffect(() => {
    if (!isQuad) return;
    if (!quadSelectedMaterial) {
      if (vendorName) {
        setVendorName("");
        setVendorNameOther("");
      }
      return;
    }
    if (vendorName && vendorName !== "Other" && !quadSupplierOptions.includes(vendorName)) {
      setVendorName("");
      setVendorNameOther("");
    }
  }, [isQuad, quadSelectedMaterial, quadSupplierOptions, vendorName, setVendorName, setVendorNameOther]);
}
