import { newLine, PRODUCTS } from "@/components/today/today-hub-model";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubPurchase } from "@/components/today/hub/useTodayHubPurchase";
import type { TodayHubSale } from "@/components/today/hub/useTodayHubSale";

export function resetTodayHubPurchase(purchase: TodayHubPurchase, isCat6: boolean) {
  purchase.setPurchaseType("RAW_MATERIAL");
  purchase.setPurchaseTypeOther("");
  purchase.setVendorName("");
  purchase.setVendorNameOther("");
  purchase.setBillNumber("");
  purchase.setPurchaseGstin("");
  purchase.setPurchaseBooksDate("");
  purchase.setPurchaseRemarks("");
  purchase.setBillPhotos([]);
  purchase.setPurchaseLines([newLine(isCat6 ? "NOS" : "KGS", "")]);
}

export function resetTodayHubSale(
  sale: TodayHubSale,
  catalogs: TodayHubCatalogs,
  isCat6: boolean,
  isConductor: boolean,
) {
  const { customers, saleProducts } = catalogs;
  sale.setCustomerName(customers[0] ?? "");
  sale.setCustomerNameOther("");
  sale.setSaleType(isConductor ? "COPPER_SCRAP" : "FINISHED_GOOD");
  sale.setSaleTypeOther("");
  sale.setInvoiceNo("");
  sale.setSaleRemarks("");
  sale.setInvoicePhotos([]);
  sale.setSaleLines([
    newLine(isCat6 ? "NOS" : PRODUCTS[0].unit, saleProducts[0] ?? PRODUCTS[0].name),
  ]);
}
