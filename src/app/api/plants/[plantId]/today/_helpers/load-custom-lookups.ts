import { prisma } from "@/lib/db";
import type { PlantIdFilter } from "@/lib/plant-merge";

export async function loadCustomLookups(pScope: PlantIdFilter) {
  const [
    purchaseVendors,
    purchaseItems,
    purchaseUnits,
    saleCustomers,
    saleItems,
    saleUnits,
    stockItems,
    stockUnits,
    assets,
  ] = await Promise.all([
    prisma.purchase.findMany({
      where: { ...pScope },
      select: { vendorName: true },
      distinct: ["vendorName"],
    }),
    prisma.purchase.findMany({
      where: { ...pScope },
      select: { itemDescription: true },
      distinct: ["itemDescription"],
    }),
    prisma.purchase.findMany({
      where: { ...pScope },
      select: { unit: true },
      distinct: ["unit"],
    }),
    prisma.sale.findMany({
      where: { ...pScope },
      select: { customerName: true },
      distinct: ["customerName"],
    }),
    prisma.sale.findMany({
      where: { ...pScope },
      select: { itemDescription: true },
      distinct: ["itemDescription"],
    }),
    prisma.sale.findMany({
      where: { ...pScope },
      select: { unit: true },
      distinct: ["unit"],
    }),
    prisma.stockEntry.findMany({
      where: { ...pScope },
      select: { itemName: true },
      distinct: ["itemName"],
    }),
    prisma.stockEntry.findMany({
      where: { ...pScope },
      select: { unit: true },
      distinct: ["unit"],
    }),
    prisma.fixedAsset.findMany({
      where: { ...pScope, vendor: { not: null } },
      select: { vendor: true },
      distinct: ["vendor"],
    }),
  ]);

  const isOtherLabel = (v: string) => /^(other|others)$/i.test(v.trim());
  const uniq = (values: Array<string | null | undefined>) =>
    Array.from(
      new Set(
        values
          .map((v) => (v ?? "").trim())
          .filter((v) => v.length > 0 && !isOtherLabel(v)),
      ),
    ).sort((a, b) => a.localeCompare(b));

  return {
    customSuppliers: uniq(purchaseVendors.map((p) => p.vendorName)),
    customCustomers: uniq(saleCustomers.map((s) => s.customerName)),
    customPurchaseItems: uniq(purchaseItems.map((p) => p.itemDescription)),
    customSaleItems: uniq(saleItems.map((s) => s.itemDescription)),
    customStockItems: uniq(stockItems.map((s) => s.itemName)),
    customFarVendors: uniq(assets.map((a) => a.vendor)),
    customUnits: uniq([
      ...purchaseUnits.map((p) => p.unit),
      ...saleUnits.map((s) => s.unit),
      ...stockUnits.map((s) => s.unit),
    ]),
  };
}
