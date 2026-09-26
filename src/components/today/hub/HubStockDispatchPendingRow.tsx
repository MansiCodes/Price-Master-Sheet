import type { Dispatch, SetStateAction } from "react";
import { DecimalInput } from "@/components/ui/DecimalInput";
import type { StockDispatchPendingItem } from "@/components/today/today-hub-model";

function patchDispatchItem(
  setItems: Dispatch<SetStateAction<StockDispatchPendingItem[]>>,
  idx: number,
  patch: Partial<StockDispatchPendingItem>,
) {
  setItems((prev) => {
    const next = [...prev];
    next[idx] = { ...next[idx], ...patch };
    return next;
  });
}

const REMOVE_BTN_STYLE = {
  height: "38px",
  width: "36px",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

function HubStockDispatchQtyField({
  item, idx, setItems, onFirstQty,
}: {
  item: StockDispatchPendingItem;
  idx: number;
  setItems: Dispatch<SetStateAction<StockDispatchPendingItem[]>>;
  onFirstQty: (val: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={`st-dispatch-pending-${idx}`}>Qty</label>
      <DecimalInput
        id={`st-dispatch-pending-${idx}`}
        value={item.qty}
        onChange={(val) => {
          patchDispatchItem(setItems, idx, { qty: val });
          if (idx === 0) onFirstQty(val);
        }}
        placeholder="0"
      />
    </div>
  );
}

function HubStockDispatchPartyField({
  item, idx, setItems, onFirstParty,
}: {
  item: StockDispatchPendingItem;
  idx: number;
  setItems: Dispatch<SetStateAction<StockDispatchPendingItem[]>>;
  onFirstParty: (val: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={`st-dispatch-party-${idx}`} style={{ whiteSpace: "nowrap" }}>
        Party name
      </label>
      <input
        id={`st-dispatch-party-${idx}`}
        value={item.partyName}
        onChange={(e) => {
          const val = e.target.value;
          patchDispatchItem(setItems, idx, { partyName: val });
          if (idx === 0) onFirstParty(val);
        }}
        placeholder="Party name"
      />
    </div>
  );
}

function HubStockDispatchRemove({
  idx, count, onRemove,
}: {
  idx: number;
  count: number;
  onRemove: (idx: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {idx > 0 ? (
        <button
          type="button"
          className="btn btn--sm btn--danger"
          style={REMOVE_BTN_STYLE}
          onClick={() => onRemove(idx)}
          title="Remove Dispatch pending"
        >
          ✕
        </button>
      ) : (
        <div style={{ width: "36px", height: "38px" }} />
      )}
    </div>
  );
}

type HubStockDispatchPendingRowProps = {
  item: StockDispatchPendingItem;
  idx: number;
  items: StockDispatchPendingItem[];
  setItems: Dispatch<SetStateAction<StockDispatchPendingItem[]>>;
  onFirstQty: (val: string) => void;
  onFirstParty: (val: string) => void;
  onRemove: (idx: number) => void;
};

export function HubStockDispatchPendingRow({
  item, idx, items, setItems, onFirstQty, onFirstParty, onRemove,
}: HubStockDispatchPendingRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: items.length > 1 ? "1fr 3.9fr 36px" : "1fr 3.9fr",
        gap: "10px",
        alignItems: "flex-end",
        marginBottom: idx < items.length - 1 ? "12px" : 0,
      }}
    >
      <HubStockDispatchQtyField item={item} idx={idx} setItems={setItems} onFirstQty={onFirstQty} />
      <HubStockDispatchPartyField item={item} idx={idx} setItems={setItems} onFirstParty={onFirstParty} />
      <HubStockDispatchRemove idx={idx} count={items.length} onRemove={onRemove} />
    </div>
  );
}
