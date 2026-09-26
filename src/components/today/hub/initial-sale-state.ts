import { newLine, PRODUCTS, type SaleTypeValue } from "@/components/today/today-hub-model";

export function initialSaleType(plantCode: string): SaleTypeValue {
  return plantCode.toUpperCase() === "CONDUCTOR" ? "COPPER_SCRAP" : "FINISHED_GOOD";
}

export function initialSaleLines(plantCode: string) {
  return [
    newLine(
      PRODUCTS[0].unit,
      plantCode.toUpperCase() === "CONDUCTOR" ? "1.4mm" : PRODUCTS[0].name,
    ),
  ];
}
