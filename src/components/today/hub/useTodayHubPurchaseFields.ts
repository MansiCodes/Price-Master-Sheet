import { useState } from "react";
import { isCat6Plant } from "@/lib/plant-layout";
import { newLine, type PurchaseTypeValue } from "@/components/today/today-hub-model";

export function useTodayHubPurchaseFields(plantCode: string) {
  const [purchaseType, setPurchaseType] = useState<PurchaseTypeValue>("RAW_MATERIAL");
  const [purchaseTypeOther, setPurchaseTypeOther] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorNameOther, setVendorNameOther] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [purchaseGstin, setPurchaseGstin] = useState("");
  const [purchaseBooksDate, setPurchaseBooksDate] = useState("");
  const [purchaseRemarks, setPurchaseRemarks] = useState("");
  const [billPhotos, setBillPhotos] = useState<string[]>([]);
  const [purchaseLines, setPurchaseLines] = useState(() => [
    newLine(isCat6Plant(plantCode) ? "NOS" : "KGS", ""),
  ]);
  const [purchaseSource, setPurchaseSource] = useState<"vendor" | "atcl">("vendor");
  return {
    purchaseType, setPurchaseType, purchaseTypeOther, setPurchaseTypeOther,
    vendorName, setVendorName, vendorNameOther, setVendorNameOther,
    billNumber, setBillNumber, purchaseGstin, setPurchaseGstin,
    purchaseBooksDate, setPurchaseBooksDate, purchaseRemarks, setPurchaseRemarks,
    billPhotos, setBillPhotos, purchaseLines, setPurchaseLines,
    purchaseSource, setPurchaseSource,
  };
}
