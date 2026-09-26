import { isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";

export type PlantFamily =
  | "upcast"
  | "pvc"
  | "cat6"
  | "conductor"
  | "quadsignal"
  | "default";

export function plantFamily(code: string): PlantFamily {
  const c = code.trim().toUpperCase();
  if (c === "UPCAST") return "upcast";
  if (c === "PVC") return "pvc";
  if (isCat6Plant(c)) return "cat6";
  if (c === "CONDUCTOR") return "conductor";
  if (isQuadSignalPlant(c)) return "quadsignal";
  return "default";
}
