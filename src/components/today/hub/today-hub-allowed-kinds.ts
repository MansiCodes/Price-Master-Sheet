import {
  ENTRY_KINDS,
  type EntryKind,
  type TodayModuleKey,
} from "@/components/today/today-hub-model";

export function allowedEntryKinds(accountantOnly: boolean, stockEntryOnly: boolean): EntryKind[] {
  if (stockEntryOnly) return ["stock"];
  if (accountantOnly) return ["purchase", "sale"];
  return [...ENTRY_KINDS];
}

export function allowedModuleKeys(accountantOnly: boolean, stockEntryOnly: boolean) {
  if (stockEntryOnly) return new Set(["stockFilled"] as TodayModuleKey[]);
  if (accountantOnly) return new Set(["purchaseFilled", "saleFilled"] as TodayModuleKey[]);
  return new Set([
    "purchaseFilled",
    "saleFilled",
    "stockFilled",
    "pettyCashFilled",
  ] as TodayModuleKey[]);
}
