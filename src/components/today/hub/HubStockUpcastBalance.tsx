import { DecimalInput } from "@/components/ui/DecimalInput";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { applyUpcastClosing } from "@/components/today/hub/apply-upcast-closing";

export function HubStockUpcastBalance({ vm }: { vm: TodayHubVm }) {
  const {
    upcastOpeningQty, setUpcastOpeningQty, upcastIncomingQty, setUpcastIncomingQty,
    upcastOutwardQty, setUpcastOutwardQty, upcastCalculatedClosing, setStockQty, setStockValue, stockRate,
  } = bindStockLocals(vm);
  return (
    <div style={{ background: "#f0fdfa", padding: "14px", borderRadius: "8px", border: "1px solid #ccfbf1" }}>
      <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", fontWeight: 700, color: "#0f766e" }}>
        1. Upcast Stock Balance
      </h4>
      <HubStockUpcastBalanceInputs vm={vm} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #ccfbf1", fontSize: "0.85rem", fontWeight: 600, color: "#0f766e" }}>
        <span>Closing Stock = Opening ({upcastOpeningQty || 0}) + Incoming ({upcastIncomingQty || 0}) − Outward ({upcastOutwardQty || 0})</span>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0d9488" }}>
          = {upcastCalculatedClosing.toLocaleString("en-IN", { maximumFractionDigits: 3 })} KGS
        </span>
      </div>
    </div>
  );
}

export function HubStockUpcastBalanceInputs({ vm }: { vm: TodayHubVm }) {
  const {
    upcastOpeningQty, setUpcastOpeningQty, upcastIncomingQty, setUpcastIncomingQty,
    upcastOutwardQty, setUpcastOutwardQty, setStockQty, setStockValue, stockRate,
  } = bindStockLocals(vm);
  return (
    <div className="form-grid three" style={{ marginBottom: "10px" }}>
      <div className="field">
        <label htmlFor="upcast-open">Opening Stock (KGS)</label>
        <DecimalInput
          id="upcast-open"
          value={upcastOpeningQty}
          onChange={(next) => {
            setUpcastOpeningQty(next);
            applyUpcastClosing(next, upcastIncomingQty, upcastOutwardQty, stockRate, setStockQty, setStockValue);
          }}
          placeholder="0"
        />
      </div>
      <HubStockUpcastInOut vm={vm} />
    </div>
  );
}

function HubStockUpcastIncoming({ vm }: { vm: TodayHubVm }) {
  const {
    upcastOpeningQty, upcastIncomingQty, setUpcastIncomingQty, upcastOutwardQty,
    setStockQty, setStockValue, stockRate,
  } = bindStockLocals(vm);
  return (
    <div className="field">
      <label htmlFor="upcast-in">Incoming Stock (KGS)</label>
      <DecimalInput
        id="upcast-in"
        value={upcastIncomingQty}
        onChange={(next) => {
          setUpcastIncomingQty(next);
          applyUpcastClosing(upcastOpeningQty, next, upcastOutwardQty, stockRate, setStockQty, setStockValue);
        }}
        placeholder="0"
      />
    </div>
  );
}

function HubStockUpcastOutward({ vm }: { vm: TodayHubVm }) {
  const {
    upcastOpeningQty, upcastIncomingQty, upcastOutwardQty, setUpcastOutwardQty,
    setStockQty, setStockValue, stockRate,
  } = bindStockLocals(vm);
  return (
    <div className="field">
      <label htmlFor="upcast-out">Outward / Issued Stock (KGS)</label>
      <DecimalInput
        id="upcast-out"
        value={upcastOutwardQty}
        onChange={(next) => {
          setUpcastOutwardQty(next);
          applyUpcastClosing(upcastOpeningQty, upcastIncomingQty, next, stockRate, setStockQty, setStockValue);
        }}
        placeholder="0"
      />
    </div>
  );
}

function HubStockUpcastInOut({ vm }: { vm: TodayHubVm }) {
  return (
    <>
      <HubStockUpcastIncoming vm={vm} />
      <HubStockUpcastOutward vm={vm} />
    </>
  );
}
