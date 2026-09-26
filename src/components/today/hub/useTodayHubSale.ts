import { useState } from "react";
import type { SaleTypeValue } from "@/components/today/today-hub-model";
import { initialSaleLines, initialSaleType } from "@/components/today/hub/initial-sale-state";

export function useTodayHubSale(plantCode: string) {
  const [customerName, setCustomerName] = useState("");
  const [customerNameOther, setCustomerNameOther] = useState("");
  const [saleType, setSaleType] = useState<SaleTypeValue>(() => initialSaleType(plantCode));
  const [saleTypeOther, setSaleTypeOther] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleRemarks, setSaleRemarks] = useState("");
  const [invoicePhotos, setInvoicePhotos] = useState<string[]>([]);
  const [saleLines, setSaleLines] = useState(() => initialSaleLines(plantCode));
  return {
    customerName, setCustomerName, customerNameOther, setCustomerNameOther,
    saleType, setSaleType, saleTypeOther, setSaleTypeOther,
    invoiceNo, setInvoiceNo, saleRemarks, setSaleRemarks,
    invoicePhotos, setInvoicePhotos, saleLines, setSaleLines,
  };
}

export type TodayHubSale = ReturnType<typeof useTodayHubSale>;
