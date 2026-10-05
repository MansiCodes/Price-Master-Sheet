import { isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";

export function initialExpenseHead(plantCode: string) {
  if (isCat6Plant(plantCode)) return "Miscellaneous";
  const code = plantCode.toUpperCase();
  if (
    code === "UPCAST"
  ) {
    return "Fuel & Power";
  }
  if (
    code === "LEDROPE" ||
    code === "SLSSL" ||
    isQuadSignalPlant(plantCode)
  ) {
    return "Electricity";
  }
  return "Fuel & Power";
}
