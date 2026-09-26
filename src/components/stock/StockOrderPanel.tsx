import type { CableStockStatusBlock } from "@/lib/stock-production-status";
import type {
  StockOrderBySize,
  StockOrderPartyLine,
} from "@/lib/stock/order-excel-types";
import {
  formatDeliveryDisplay,
  formatNum,
  getPartyInHandKm,
} from "./stock-status-format";

export function StockOrderPanel({
  order,
  block,
  balanceTotal,
  partyLines,
  deliveryDates,
}: {
  order: StockOrderBySize;
  block: CableStockStatusBlock | null;
  balanceTotal: number;
  partyLines: StockOrderPartyLine[];
  deliveryDates: string[];
}) {
  return (
    <div className="stock-status-card__orders" aria-label="Orders in hand">
      <div className="stock-status-card__orders-header">
        <div className="stock-status-card__orders-summary">
          <span className="stock-status-card__orders-title">ORDER IN HAND</span>
          <span className="stock-status-card__dash" aria-hidden>
            {" "}
            —{" "}
          </span>
          <span className="stock-status-card__orders-qty">
            <strong>{formatNum(order.totalQty)}</strong> km
          </span>
        </div>
        <div className="stock-status-card__orders-avail">
          <span className="stock-status-card__avail-label">Balance</span>
          <span className="stock-status-card__dash" aria-hidden>
            {" "}
            —{" "}
          </span>
          <span
            className={`stock-status-card__avail-value${
              balanceTotal > 0 ? " is-short" : ""
            }`}
          >
            {formatNum(balanceTotal)} km
          </span>
        </div>
      </div>

      {partyLines.length > 0 ? (
        <div className="stock-status-card__party-table-wrapper">
          <table className="stock-status-card__party-table">
            <thead>
              <tr>
                <th scope="col" className="col-party">
                  PARTY NAME
                </th>
                <th scope="col" className="col-qty">
                  QTY
                </th>
                <th scope="col" className="col-inhand">
                  DONE
                </th>
                <th scope="col" className="col-balance">
                  BALANCE
                </th>
                <th scope="col" className="col-delivery">
                  D.P.
                </th>
              </tr>
            </thead>
            <tbody>
              {partyLines.map((p, i) => {
                const inHandKm = getPartyInHandKm(p.partyName, block);
                const partyBalance = Math.max(
                  0,
                  Math.round((p.qty - inHandKm) * 10000) / 10000,
                );
                return (
                  <tr
                    key={`${p.partyName}-${p.deliveryPeriod ?? ""}-${i}`}
                  >
                    <td className="col-party">
                      <span className="party-dot">&bull;</span> {p.partyName}
                    </td>
                    <td className="col-qty">
                      <strong>{formatNum(p.qty)}</strong> km
                    </td>
                    <td className="col-inhand">
                      {inHandKm > 0 ? (
                        <>
                          <strong>{formatNum(inHandKm)}</strong> km
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="col-balance">
                      <strong>{formatNum(partyBalance)}</strong> km
                    </td>
                    <td className="col-delivery">
                      {formatDeliveryDisplay(p.deliveryPeriod)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {deliveryDates.length > 0 &&
      partyLines.every((p) => !p.deliveryPeriod) ? (
        <p className="stock-status-card__orders-delivery">
          <span className="stock-status-card__orders-label">D.P.</span>
          <span className="stock-status-card__dash" aria-hidden>
            {" "}
            —{" "}
          </span>
          {deliveryDates.map((d) => formatDeliveryDisplay(d)).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
