import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockQtyField({ vm }: { vm: TodayHubVm }) {
  const { usesStockLedger, stockQty, setStockQty, stockRate, setStockValue } = bindStockLocals(vm);
  return (
    <div className="field">
      <label htmlFor="st-qty">{usesStockLedger ? "Closing Stock" : "Quantity"}</label>
      <DecimalInput
        id="st-qty"
        required
        value={stockQty}
        onChange={(next) => {
          setStockQty(next);
          const qty = Number(next);
          const rate = Number(stockRate);
          if (usesStockLedger && Number.isFinite(qty) && Number.isFinite(rate)) {
            setStockValue((qty * rate).toFixed(2));
          }
        }}
      />
    </div>
  );
}

export function HubStockUnitField({ vm }: { vm: TodayHubVm }) {
  const { usesStockLedger, isCat6, isConductor, isQuad, stockUnitOptions, stockUnit, stockCatalog, setStockUnit } =
    bindStockLocals(vm);
  return (
    <div className="field">
      <label htmlFor="st-unit">Unit</label>
      {usesStockLedger || isCat6 || isConductor || isQuad ? (
        <SelectMenu
          id="st-unit"
          value={stockUnitOptions.includes(stockUnit) ? stockUnit : stockCatalog.defaultUnit}
          options={stockUnitOptions}
          required
          onChange={setStockUnit}
        />
      ) : (
        <input id="st-unit" value="kg" readOnly />
      )}
    </div>
  );
}

export function HubStockRateField({ vm }: { vm: TodayHubVm }) {
  const { isQuad, stockKind, quadCableProcessFields, stockRate, setStockRate, stockQty, setStockValue } =
    bindStockLocals(vm);
  if (isQuad && stockKind === "cable" && quadCableProcessFields.length % 2 === 1) return null;
  return (
    <div className="field">
      <label htmlFor="st-rate">Rate</label>
      <DecimalInput
        id="st-rate"
        value={stockRate}
        onChange={(next) => {
          setStockRate(next);
          const qty = Number(stockQty);
          const rate = Number(next);
          if (Number.isFinite(qty) && Number.isFinite(rate)) {
            setStockValue((qty * rate).toFixed(2));
          }
        }}
        placeholder="0"
      />
    </div>
  );
}

export function HubStockQtyValue({ vm }: { vm: TodayHubVm }) {
  return (
    <>
      <HubStockQtyField vm={vm} />
      <HubStockUnitField vm={vm} />
      <HubStockRateField vm={vm} />
    </>
  );
}
