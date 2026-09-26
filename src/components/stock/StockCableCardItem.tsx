import {
  formatCallPutupItemsList,
  formatDispatchItemsList,
  formatProcessStatusItem,
  outerClosingAfterPutup,
} from "@/lib/stock-production-status";
import {
  lookupStockOrder,
  type StockOrderBySize,
} from "@/lib/stock/order-excel-types";
import { StockOrderPanel } from "./StockOrderPanel";
import { CalendarIcon } from "./StockStatusToolbar";
import { formatNum, type DisplayCard } from "./stock-status-format";
import { getProcessIcon } from "./stock-process-icon";

export function StockCableCardItem({
  card,
  idx,
  page,
  pageSize,
  emptyLabel,
  ordersByKey,
}: {
  card: DisplayCard;
  idx: number;
  page: number;
  pageSize: number;
  emptyLabel: string;
  ordersByKey: Record<string, StockOrderBySize> | null;
}) {
  const block = card.block;
  const order = lookupStockOrder(ordersByKey, card.cable, card.size);
  const stockTotal = block?.totalKm ?? 0;
  const orderQty = order?.totalQty ?? 0;
  const putupKm = block?.putupKm ?? 0;
  const dispatchPending = block?.dispatchPending ?? 0;
  const totalDoneKm = putupKm + dispatchPending;
  const balanceTotal =
    Math.round((orderQty - totalDoneKm - stockTotal) * 10000) / 10000;
  const partyLines = order
    ? order.parties.filter(
        (p) => p.partyName.trim() && p.partyName.trim() !== "—",
      )
    : [];
  const deliveryDates = order
    ? [
        ...new Set(
          order.parties
            .map((p) => p.deliveryPeriod)
            .filter((d): d is string => Boolean(d)),
        ),
      ]
    : [];

  return (
    <li
      className={`stock-status-card${block ? "" : " is-empty"}${
        order ? " has-order" : ""
      }`}
    >
      <div className="stock-status-card__header">
        <div className="stock-status-card__title-group">
          <span className="stock-status-card__icon-tile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </span>
          <h3 className="stock-status-card__cable-name">
            {card.cable} <span className="stock-status-card__index">({(page - 1) * pageSize + idx + 1})</span>
          </h3>
        </div>
        <span className="stock-status-card__size-pill">{card.size}</span>
      </div>

      <div className="stock-status-card__body">
        <div className="stock-status-card__stock">
          {block ? (
            <>
              <div className="stock-proc-grid">
                {block.processes.map((p) => {
                  const putupForOuter = block.putupKm ?? 0;
                  const isOuter =
                    p.name.trim().toLowerCase() === "outer sheath" ||
                    p.name.trim().toLowerCase() === "outer";
                  const afterPutup =
                    isOuter && putupForOuter > 0
                      ? outerClosingAfterPutup(p.closing, putupForOuter)
                      : null;
                  const item = formatProcessStatusItem(p);
                  return (
                    <div key={p.name} className="stock-proc-chip">
                      <div className="stock-proc-chip__head">
                        <span className="stock-proc-chip__icon">{getProcessIcon(p.name)}</span>
                        <span className="stock-proc-chip__label">{p.name}</span>
                      </div>
                      {afterPutup != null ? (
                        <span className="stock-proc-chip__val stock-proc-chip__val--row">
                          <span className="stock-proc-chip__val--sm">{item.value}</span>
                          <span>{formatNum(afterPutup)}km</span>
                        </span>
                      ) : (
                        <span className="stock-proc-chip__val">{item.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {formatCallPutupItemsList(block).length > 0 ? (
                <div className="stock-call-putup-line">
                  <span className="stock-call-putup-icon"><CalendarIcon /></span>
                  <span className="stock-call-putup-text">
                    {formatCallPutupItemsList(block)
                      .map((p) => `${p.label} ${p.value}`)
                      .join(" | ")}
                  </span>
                </div>
              ) : null}

              <div className="stock-total-row">
                <div className="stock-total-group">
                  <span className="stock-total-label">Total</span>
                  <span className="stock-total-value">{formatNum(stockTotal)} km</span>
                </div>
                {formatDispatchItemsList(block).length > 0 ? (
                  <div className="stock-dispatch-group">
                    <span className="stock-dispatch-text">
                      {formatDispatchItemsList(block)
                        .map((d) => `${d.label} ${d.value}`)
                        .join(" | ")}
                    </span>
                    <span className="stock-pending-badge">Pending Dispatch</span>
                  </div>
                ) : (
                  <span className="stock-closing-date">Closing stock as on {block.entryDate}</span>
                )}
              </div>

              {block.userNotes &&
              !/^closing stock as on/i.test(block.userNotes.trim()) ? (
                <p className="stock-status-card__notes">{block.userNotes}</p>
              ) : null}
            </>
          ) : (
            <p className="stock-status-card__empty">{emptyLabel}</p>
          )}
        </div>

        {order ? (
          <StockOrderPanel
            order={order}
            block={block}
            balanceTotal={balanceTotal}
            partyLines={partyLines}
            deliveryDates={deliveryDates}
          />
        ) : null}
      </div>
    </li>
  );
}
