import type { Dispatch, SetStateAction } from "react";
import { todayLocalISO } from "@/lib/client-forms";
import type { StockCallPutupItem } from "@/components/today/today-hub-model";

function patchCallPutupItem(
  setItems: Dispatch<SetStateAction<StockCallPutupItem[]>>,
  idx: number,
  patch: Partial<StockCallPutupItem>,
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

type CallPutupFieldProps = {
  item: StockCallPutupItem;
  idx: number;
  setItems: Dispatch<SetStateAction<StockCallPutupItem[]>>;
};

function HubStockCallPutupQtyField({
  item, idx, setItems, onFirstQty,
}: CallPutupFieldProps & { onFirstQty: (val: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={`st-call-putup-${idx}`}>Qty</label>
      <input
        id={`st-call-putup-${idx}`}
        value={item.qty}
        onChange={(e) => {
          const val = e.target.value;
          patchCallPutupItem(setItems, idx, { qty: val });
          if (idx === 0) onFirstQty(val);
        }}
        placeholder="0"
      />
    </div>
  );
}

function HubStockCallPutupDateField({
  item, idx, setItems, onFirstDate,
}: CallPutupFieldProps & { onFirstDate: (val: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={`st-putup-date-${idx}`}>Date</label>
      <input
        id={`st-putup-date-${idx}`}
        type="date"
        max={todayLocalISO()}
        value={item.date}
        onChange={(e) => {
          const val = e.target.value;
          patchCallPutupItem(setItems, idx, { date: val });
          if (idx === 0) onFirstDate(val);
        }}
      />
    </div>
  );
}

function HubStockCallPutupPartyField({
  item, idx, setItems, onFirstParty,
}: CallPutupFieldProps & { onFirstParty: (val: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={`st-party-name-${idx}`} style={{ whiteSpace: "nowrap" }}>
        Party name
      </label>
      <input
        id={`st-party-name-${idx}`}
        value={item.partyName}
        onChange={(e) => {
          const val = e.target.value;
          patchCallPutupItem(setItems, idx, { partyName: val });
          if (idx === 0) onFirstParty(val);
        }}
        placeholder="Party name"
      />
    </div>
  );
}

function HubStockCallPutupRemove({
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
          title="Remove Call put up"
        >
          ✕
        </button>
      ) : (
        <div style={{ width: "36px", height: "38px" }} />
      )}
    </div>
  );
}

type HubStockCallPutupRowProps = {
  item: StockCallPutupItem;
  idx: number;
  items: StockCallPutupItem[];
  setItems: Dispatch<SetStateAction<StockCallPutupItem[]>>;
  onFirstQty: (val: string) => void;
  onFirstDate: (val: string) => void;
  onFirstParty: (val: string) => void;
  onRemove: (idx: number) => void;
};

export function HubStockCallPutupRow({
  item, idx, items, setItems, onFirstQty, onFirstDate, onFirstParty, onRemove,
}: HubStockCallPutupRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: items.length > 1 ? "1fr 1.4fr 2.5fr 36px" : "1fr 1.4fr 2.5fr",
        gap: "10px",
        alignItems: "flex-end",
        marginBottom: idx < items.length - 1 ? "12px" : 0,
      }}
    >
      <HubStockCallPutupQtyField item={item} idx={idx} setItems={setItems} onFirstQty={onFirstQty} />
      <HubStockCallPutupDateField item={item} idx={idx} setItems={setItems} onFirstDate={onFirstDate} />
      <HubStockCallPutupPartyField item={item} idx={idx} setItems={setItems} onFirstParty={onFirstParty} />
      <HubStockCallPutupRemove idx={idx} count={items.length} onRemove={onRemove} />
    </div>
  );
}
