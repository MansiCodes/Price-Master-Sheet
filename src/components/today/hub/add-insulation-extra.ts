import { getQuadSignalCableSizes } from "@/lib/plant-catalogs";
import type { StockInsulationExtra } from "@/components/today/today-hub-model";

export function nextInsulationExtra(
  catalogKey: "Signalling Cable" | "Quad Cable",
  resolvedQuadSizeName: string,
  prev: StockInsulationExtra[],
): StockInsulationExtra[] {
  const size =
    getQuadSignalCableSizes(catalogKey).find(
      (s) => s !== "Other" && s !== resolvedQuadSizeName && !prev.some((p) => p.size === s),
    ) ?? "Other";
  return [
    ...prev,
    {
      id: `ins-extra-${Date.now()}-${prev.length}`,
      size,
      sizeOther: "",
      lengthValue: "",
      lengthUnit: "km" as const,
      lengthUnitOther: "",
      layingProduced: "",
    },
  ];
}
