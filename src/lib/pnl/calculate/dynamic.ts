import type { PlantPnlStatement } from "@/lib/pnl/types";
import { computeDynamicTotals } from "./dynamic-compute";
import { fetchDynamicInputs } from "./dynamic-query";
import { assembleDynamicStatement } from "./dynamic-statement";

/** Dynamic calculation from raw entries (original logic). */
export async function buildDynamic(
  plantIds: string[],
  from: Date,
  to: Date,
  scoped: boolean,
  enteredById?: string,
  plantCode?: string | null,
  approvedOnly?: boolean,
): Promise<PlantPnlStatement> {
  const data = await fetchDynamicInputs(
    plantIds,
    from,
    to,
    scoped,
    enteredById,
    plantCode,
    approvedOnly,
  );
  const totals = computeDynamicTotals(data, plantCode);
  return assembleDynamicStatement(totals, data.isPvc);
}
