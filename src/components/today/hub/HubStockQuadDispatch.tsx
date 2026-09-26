import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockDispatchPendingRow } from "@/components/today/hub/HubStockDispatchPendingRow";

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

function HubStockDispatchHead({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="qs-wip__box-head" style={HEAD_STYLE}>
      <h4 className="qs-wip__box-title" style={{ margin: 0 }}>
        Dispatch pending
      </h4>
      <button
        type="button"
        className="btn btn--sm btn--outline"
        style={ADD_BTN_STYLE}
        onClick={onAdd}
        title="Add Dispatch pending"
      >
        +
      </button>
    </div>
  );
}

function HubStockDispatchList({ vm }: { vm: TodayHubVm }) {
  const {
    stockDispatchPendingItems, setStockDispatchPendingItems,
    setStockDispatchPending, setStockDispatchParty,
  } = bindStockLocals(vm);
  return (
    <>
      {stockDispatchPendingItems.map((item, idx) => (
        <HubStockDispatchPendingRow
          key={`dispatch-${idx}`}
          item={item}
          idx={idx}
          items={stockDispatchPendingItems}
          setItems={setStockDispatchPendingItems}
          onFirstQty={setStockDispatchPending}
          onFirstParty={setStockDispatchParty}
          onRemove={(i) =>
            setStockDispatchPendingItems((prev) => prev.filter((_, j) => j !== i))
          }
        />
      ))}
    </>
  );
}

export function HubStockQuadDispatch({ vm }: { vm: TodayHubVm }) {
  const { setStockDispatchPendingItems } = bindStockLocals(vm);
  return (
    <>
      <div className="qs-wip__box">
        <HubStockDispatchHead
          onAdd={() =>
            setStockDispatchPendingItems((prev) => [...prev, { qty: "", partyName: "" }])
          }
        />
        <HubStockDispatchList vm={vm} />
      </div>
    </>
  );
}
