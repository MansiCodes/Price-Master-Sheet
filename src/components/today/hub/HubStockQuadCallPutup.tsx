import { useEffect } from "react";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockCallPutupRow } from "@/components/today/hub/HubStockCallPutupRow";
import { sumCallPutupKm } from "@/components/today/hub/process-row-out-label";
import { formatDayMonthYear } from "@/lib/dates";

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

function HubStockCallPutupHead({
  onAdd,
  totalKm,
}: {
  onAdd: () => void;
  totalKm: number;
}) {
  return (
    <div className="qs-wip__box-head" style={HEAD_STYLE}>
      <h4 className="qs-wip__box-title" style={{ margin: 0 }}>
        Call put up
        {totalKm > 0 ? (
          <span style={{ marginLeft: "8px", fontWeight: 600, fontSize: "0.85rem", color: "#0f766e" }}>
            Total {totalKm} km
          </span>
        ) : null}
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
            setStockCallPutupItems((prev) => {
              const next = prev.filter((_, j) => j !== i);
              return next.length > 0 ? next : [{ qty: "", date: "", partyName: "" }];
            })
          }
        />
      ))}
    </>
  );
}

function HubStockCallPutupCarried({ vm }: { vm: TodayHubVm }) {
  const { stockCallPutupLoadedItems, setStockCallPutupLoadedItems } = bindStockLocals(vm);
  if (stockCallPutupLoadedItems.length === 0) return null;
  const km = Math.round(sumCallPutupKm(stockCallPutupLoadedItems) * 1000) / 1000;
  return (
    <div className="qs-wip__carried">
      <div className="qs-wip__carried-head">Total {km} km</div>
      <ul className="qs-wip__carried-list">
        {stockCallPutupLoadedItems.map((item, idx) => (
          <li key={`carried-putup-${idx}`} className="qs-wip__carried-item">
            <span className="qs-wip__carried-qty">{item.qty} km</span>
            <span className="qs-wip__carried-meta">
              {[item.date ? formatDayMonthYear(item.date) : "", item.partyName]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
            <button
              type="button"
              className="qs-wip__carried-remove"
              title="Remove from list (stock is not changed)"
              onClick={() =>
                setStockCallPutupLoadedItems((prev) => prev.filter((_, j) => j !== idx))
              }
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HubStockQuadCallPutup({ vm }: { vm: TodayHubVm }) {
  const {
    setStockCallPutupItems,
    stockCallPutupItems,
    stockCallPutupLoadedKm,
    setStockCallPutupLoadedKm,
  } = bindStockLocals(vm);
  const formKm = sumCallPutupKm(stockCallPutupItems);
  useEffect(() => {
    if (formKm > stockCallPutupLoadedKm) setStockCallPutupLoadedKm(formKm);
  }, [formKm, stockCallPutupLoadedKm, setStockCallPutupLoadedKm]);
  return (
    <>
      <div className="qs-wip__box">
        <HubStockCallPutupHead
          totalKm={Math.max(stockCallPutupLoadedKm, formKm)}
          onAdd={() =>
            setStockCallPutupItems((prev) => [...prev, { qty: "", date: "", partyName: "" }])
          }
        />
        <HubStockCallPutupCarried vm={vm} />
        <HubStockCallPutupList vm={vm} />
      </div>
    </>
  );
}
