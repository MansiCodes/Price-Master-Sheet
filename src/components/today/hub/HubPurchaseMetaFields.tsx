import { SelectMenu } from "@/components/ui/SelectMenu";
import { PURCHASE_TYPES } from "@/components/today/today-hub-model";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

const PURCHASE_SOURCE_LABELS = [
  "Purchase from Vendor",
  "Stock Taken from ATCL",
];

export function purchaseFieldsSideBySide() {
  const typeLabels = PURCHASE_TYPES.map((t) => t.label);
  const maxOptLen = Math.max(
    ...typeLabels.map((l) => l.length),
    ...PURCHASE_SOURCE_LABELS.map((l) => l.length),
  );
  return { typeLabels, sideBySide: maxOptLen <= 22 };
}

function HubPurchaseTypeField({ vm, typeLabels }: { vm: TodayHubVm; typeLabels: string[] }) {
  const { purchaseType, setPurchaseType, setPurchaseTypeOther } = vm.purchase;
  return (
    <div className="field">
      <label htmlFor="p-type">Type</label>
      <SelectMenu
        id="p-type"
        value={PURCHASE_TYPES.find((t) => t.value === purchaseType)?.label ?? "Raw materials"}
        options={typeLabels}
        required
        onChange={(label) => {
          const next = PURCHASE_TYPES.find((t) => t.label === label);
          if (next) {
            setPurchaseType(next.value);
            if (next.value !== "OTHERS") setPurchaseTypeOther("");
          }
        }}
      />
    </div>
  );
}

function HubPurchaseSourceField({ vm }: { vm: TodayHubVm }) {
  const { purchaseSource, setPurchaseSource } = vm.purchase;
  return (
    <div className="field">
      <label htmlFor="p-source">Purchase source</label>
      <SelectMenu
        id="p-source"
        value={purchaseSource === "atcl" ? "Stock Taken from ATCL" : "Purchase from Vendor"}
        options={[...PURCHASE_SOURCE_LABELS]}
        required
        onChange={(label) => {
          if (label === "Stock Taken from ATCL") setPurchaseSource("atcl");
          else setPurchaseSource("vendor");
        }}
      />
    </div>
  );
}

export function HubPurchaseTypeSourceRow({ vm }: { vm: TodayHubVm }) {
  const { typeLabels, sideBySide } = purchaseFieldsSideBySide();
  return (
    <div className={`form-grid today-entry-purchase-meta-row ${sideBySide ? "two" : ""}`}>
      <HubPurchaseTypeField vm={vm} typeLabels={typeLabels} />
      <HubPurchaseSourceField vm={vm} />
    </div>
  );
}

export function HubPurchaseTypeOtherField({ vm }: { vm: TodayHubVm }) {
  const { purchaseType, purchaseTypeOther, setPurchaseTypeOther } = vm.purchase;
  if (purchaseType !== "OTHERS") return null;
  return (
    <div className="field field--wide">
      <label htmlFor="p-type-other">Other type</label>
      <input
        id="p-type-other"
        required
        placeholder="Specify purchase type"
        value={purchaseTypeOther}
        onChange={(e) => setPurchaseTypeOther(e.target.value)}
      />
    </div>
  );
}

export function HubPurchaseGstinField({ vm }: { vm: TodayHubVm }) {
  const { purchaseGstin, setPurchaseGstin } = vm.purchase;
  if (!vm.flags.isCat6) return null;
  return (
    <div className="field">
      <label htmlFor="p-gstin">GSTIN/GST No</label>
      <input
        id="p-gstin"
        value={purchaseGstin}
        onChange={(e) => setPurchaseGstin(e.target.value)}
      />
    </div>
  );
}
