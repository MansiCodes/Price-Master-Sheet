import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import {
  HubEntryDateField,
  HubEntryKindField,
  HubEntryShiftToggle,
  HubEntryStockTypeField,
  entryDateLabel,
} from "@/components/today/hub/HubEntryTopRowFields";

function HubEntryStockEntryOnlyRow({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  const showStockTypeBeside = vm.flags.isQuad && vm.kind === "stock";
  return (
    <div className={`form-grid today-entry-top-row ${showStockTypeBeside ? "two" : ""}`}>
      {showStockTypeBeside ? <HubEntryStockTypeField vm={vm} /> : null}
      <HubEntryDateField vm={vm} label={t("date")} />
    </div>
  );
}

function HubEntryShiftStockRow({
  vm, t, tCommon, showShift, showStockTypeBeside,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
  tCommon: (key: string) => string;
  showShift: boolean;
  showStockTypeBeside: boolean;
}) {
  if (!showShift && !showStockTypeBeside) return null;
  return (
    <div className={`form-grid today-entry-kind-row ${showShift && showStockTypeBeside ? "two" : ""}`}>
      {showShift ? <HubEntryShiftToggle vm={vm} t={t} tCommon={tCommon} /> : null}
      {showStockTypeBeside ? <HubEntryStockTypeField vm={vm} /> : null}
    </div>
  );
}

function HubEntryKindDateBlock({
  vm, t, tCommon,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  const { kind, flags } = vm;
  const showShift = kind !== "contactList" && kind !== "purchase" && kind !== "sale" && !flags.isCat6;
  const showStockTypeBeside = flags.isQuad && kind === "stock";
  return (
    <>
      <div className="form-grid today-entry-top-row two">
        <HubEntryKindField vm={vm} t={t} />
        <HubEntryDateField vm={vm} label={entryDateLabel(vm, t)} />
      </div>
      <HubEntryShiftStockRow
        vm={vm} t={t} tCommon={tCommon}
        showShift={showShift} showStockTypeBeside={showStockTypeBeside}
      />
    </>
  );
}

export function HubEntryTopRow({
  vm, t, tCommon,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  if (vm.kind === "contactList") return null;
  return (
    <>
      {vm.flags.stockEntryOnly ? (
        <HubEntryStockEntryOnlyRow vm={vm} t={t} />
      ) : (
        <HubEntryKindDateBlock vm={vm} t={t} tCommon={tCommon} />
      )}
    </>
  );
}
