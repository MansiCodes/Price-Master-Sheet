import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockCallPutupRow } from "@/components/today/hub/HubStockCallPutupRow";

const ADD_BTN_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "1rem",
  borderRadius: "6px",
  border: "1.5px solid #0d9488",
  color: "#0d9488",
  background: "#f0fdf4",
  width: "28px",
  height: "28px",
  padding: 0,
  lineHeight: 1,
  cursor: "pointer",
} as const;

const HEAD_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
} as const;

function HubStockCallPutupHead({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="qs-wip__box-head" style={HEAD_STYLE}>
      <h4 className="qs-wip__box-title" style={{ margin: 0 }}>
        Call put up
      </h4>
      <button
        type="button"
        className="btn btn--sm btn--outline"
        style={ADD_BTN_STYLE}
        onClick={onAdd}
        title="Add Call put up"
      >
        +
      </button>
    </div>
  );
}

function HubStockCallPutupList({ vm }: { vm: TodayHubVm }) {
  const {
    stockCallPutupItems, setStockCallPutupItems,
    setStockCallPutup, setStockPutupDate, setStockPartyName,
  } = bindStockLocals(vm);
  return (
    <>
      {stockCallPutupItems.map((item, idx) => (
        <HubStockCallPutupRow
          key={`call-putup-${idx}`}
          item={item}
          idx={idx}
          items={stockCallPutupItems}
          setItems={setStockCallPutupItems}
          onFirstQty={setStockCallPutup}
          onFirstDate={setStockPutupDate}
          onFirstParty={setStockPartyName}
          onRemove={(i) =>
            setStockCallPutupItems((prev) => prev.filter((_, j) => j !== i))
          }
        />
      ))}
    </>
  );
}

export function HubStockQuadCallPutup({ vm }: { vm: TodayHubVm }) {
  const { setStockCallPutupItems } = bindStockLocals(vm);
  return (
    <>
      <div className="qs-wip__box">
        <HubStockCallPutupHead
          onAdd={() =>
            setStockCallPutupItems((prev) => [...prev, { qty: "", date: "", partyName: "" }])
          }
        />
        <HubStockCallPutupList vm={vm} />
      </div>
    </>
  );
}
