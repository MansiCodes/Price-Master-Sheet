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

export function extrasFromPoolContributions(
  catalogKey: "Signalling Cable" | "Quad Cable",
  primarySize: string,
  contributions: Array<{
    size: string;
    layingProduced: number;
    lengthFactor: number;
  }>,
): StockInsulationExtra[] {
  const catalog = getQuadSignalCableSizes(catalogKey);
  const primary = primarySize.trim();
  return contributions
    .filter((c) => c.size.trim() && c.size.trim() !== primary)
    .map((c, i) => {
      const inCatalog = catalog.includes(c.size);
      return {
        id: `ins-extra-last-${i}-${c.size}`,
        size: inCatalog ? c.size : "Other",
        sizeOther: inCatalog ? "" : c.size,
        lengthValue: Number.isFinite(c.lengthFactor) ? String(c.lengthFactor) : "",
        lengthUnit: "km" as const,
        lengthUnitOther: "",
        layingProduced:
          Number.isFinite(c.layingProduced) && c.layingProduced > 0
            ? String(c.layingProduced)
            : "",
      };
    });
}
