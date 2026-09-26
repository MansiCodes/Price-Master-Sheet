import { useEffect } from "react";
import type { EntryKind } from "@/components/today/today-hub-model";
import { useTodayHubUpcastFields } from "@/components/today/hub/useTodayHubUpcastFields";
import {
  useTodayHubUpcastBalance,
  useTodayHubUpcastOutput,
} from "@/components/today/hub/useTodayHubUpcastDerived";

export function useTodayHubUpcast(
  isUpcast: boolean,
  kind: EntryKind,
  setStockQty: (qty: string) => void,
) {
  const fields = useTodayHubUpcastFields();
  const balance = useTodayHubUpcastBalance(isUpcast, fields);
  const output = useTodayHubUpcastOutput(isUpcast, fields, balance.upcastTotalPettyWeight);
  useEffect(() => {
    if (isUpcast && kind === "stock") {
      setStockQty(String(balance.upcastCalculatedClosing));
    }
  }, [isUpcast, kind, balance.upcastCalculatedClosing, setStockQty]);
  return { ...fields, ...balance, ...output };
}

export type TodayHubUpcast = ReturnType<typeof useTodayHubUpcast>;
