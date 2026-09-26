export function computeUpcastClosing(isUpcast: boolean, opening: string, incoming: string, outward: string) {
  if (!isUpcast) return 0;
  const o = Number(opening) || 0;
  const i = Number(incoming) || 0;
  const w = Number(outward) || 0;
  return Math.max(0, o + i - w);
}

export function computeUpcastPettyWeight(isUpcast: boolean, pettyQty: string, weightPerPetty: string) {
  if (!isUpcast) return 0;
  return (Number(pettyQty) || 0) * (Number(weightPerPetty) || 0);
}

export function computeUpcastSortingLoss(isUpcast: boolean, totalScrap: string, pettyWeight: number) {
  if (!isUpcast) return 0;
  const tot = Number(totalScrap) || 0;
  if (!tot || !pettyWeight) return 0;
  return Math.max(0, tot - pettyWeight);
}

export function computeUpcastWeightAfterBurning(isUpcast: boolean, pettyWeight: number, burningLoss: string) {
  if (!isUpcast) return 0;
  return Math.max(0, pettyWeight - (Number(burningLoss) || 0));
}

export function computeUpcastOutputWeight(isUpcast: boolean, rod: string, wire8: string, wire16: string) {
  if (!isUpcast) return 0;
  return (Number(rod) || 0) + (Number(wire8) || 0) + (Number(wire16) || 0);
}

export function computeUpcastCastingLoss(isUpcast: boolean, afterBurning: number, output: number) {
  if (!isUpcast) return 0;
  if (!afterBurning || !output) return 0;
  return Math.max(0, afterBurning - output);
}
