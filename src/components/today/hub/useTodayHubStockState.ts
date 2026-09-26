import { useMemo } from "react";
import { useTodayHubStockCableFields } from "@/components/today/hub/useTodayHubStockCableFields";
import { useTodayHubStockWipFields } from "@/components/today/hub/useTodayHubStockWipFields";
import { useTodayHubStockCallFields } from "@/components/today/hub/useTodayHubStockCallFields";
import { useTodayHubStockExtraFields } from "@/components/today/hub/useTodayHubStockExtraFields";
import { useTodayHubStockItemFields } from "@/components/today/hub/useTodayHubStockItemFields";
import { useTodayHubStockMetaFields } from "@/components/today/hub/useTodayHubStockMetaFields";
import {
  resolveQuadCableName,
  resolveQuadSizeName,
  resolveStockItemName,
} from "@/components/today/hub/resolve-stock-names";

export function useTodayHubStockState() {
  const cable = useTodayHubStockCableFields();
  const wip = useTodayHubStockWipFields();
  const call = useTodayHubStockCallFields();
  const extra = useTodayHubStockExtraFields();
  const item = useTodayHubStockItemFields();
  const meta = useTodayHubStockMetaFields();
  const resolvedQuadCableName = resolveQuadCableName(cable.stockCable, cable.stockCableOther);
  const resolvedQuadSizeName = resolveQuadSizeName(cable.stockCableSize, cable.stockCableSizeOther);
  const resolvedStockItemName = useMemo(
    () => resolveStockItemName(item.stockItem, item.stockItemOther),
    [item.stockItem, item.stockItemOther],
  );
  return { ...cable, ...wip, ...call, ...extra, ...item, ...meta, resolvedQuadCableName, resolvedQuadSizeName, resolvedStockItemName };
}

export type TodayHubStockState = ReturnType<typeof useTodayHubStockState>;
