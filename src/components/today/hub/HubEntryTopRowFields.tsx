import { todayLocalISO } from "@/lib/client-forms";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function HubEntryStockTypeField({ vm }: { vm: TodayHubVm }) {
  const { stockKind, setStockKind, setStockProcessQtys } = vm.stock;
  return (
    <div className="field">
      <label htmlFor="st-kind">Stock type</label>
      <SelectMenu
        id="st-kind"
        value={stockKind === "cable" ? "Cable" : "Raw Material"}
        options={["Raw Material", "Cable"]}
        required
        onChange={(next) => {
          setStockKind(next === "Cable" ? "cable" : "raw");
          setStockProcessQtys({});
        }}
      />
    </div>
  );
}

export function HubEntryDateField({
  vm,
  label,
}: {
  vm: TodayHubVm;
  label: string;
}) {
  const { entryDate, setEntryDate } = vm.session;
  return (
    <div className="field">
      <label htmlFor="entry-date">{label}</label>
      <input
        id="entry-date"
        type="date"
        required
        max={todayLocalISO()}
        value={entryDate}
        onChange={(e) => setEntryDate(e.target.value)}
      />
    </div>
  );
}

export function HubEntryKindField({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { kind } = vm;
  const { entryOptions, setKind } = vm.session;
  return (
    <div className="field">
      <label htmlFor="entry-kind">{t("entryType")}</label>
      <SelectMenu
        id="entry-kind"
        value={entryOptions.find((o) => o.value === kind)?.label ?? t("purchase")}
        options={entryOptions.map((o) => o.label)}
        required
        onChange={(label) => {
          const next = entryOptions.find((o) => o.label === label);
          if (next) setKind(next.value);
        }}
      />
    </div>
  );
}

export function HubEntryShiftToggle({
  vm,
  t,
  tCommon,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  const { shift, setShift } = vm.session;
  return (
    <div className="field">
      <label>{t("shift")}</label>
      <div className="shift-toggle">
        <button type="button" className={shift === "DAY" ? "is-active" : ""} onClick={() => setShift("DAY")}>
          {tCommon("day")}
        </button>
        <button type="button" className={shift === "NIGHT" ? "is-active" : ""} onClick={() => setShift("NIGHT")}>
          {tCommon("night")}
        </button>
      </div>
    </div>
  );
}

export function entryDateLabel(
  vm: TodayHubVm,
  t: (key: string) => string,
) {
  const { kind, flags, expense } = vm;
  if (flags.isCat6) return kind === "expense" ? "Date" : "Bill Date";
  if (kind === "expense" && expense.expenseHead === "Petty Cash") return t("billDate");
  return t("date");
}
