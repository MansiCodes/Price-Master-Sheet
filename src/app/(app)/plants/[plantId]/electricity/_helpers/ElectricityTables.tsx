import { formatINR } from "@/lib/format/inr";
import { formatMonthLabel } from "@/lib/dates";
import type { ElectricityRow } from "./types";

export function ElectricityTables({
  isPvc,
  rows,
  registerRows,
}: {
  isPvc: boolean;
  rows: ElectricityRow[];
  registerRows: ElectricityRow[];
}) {
  if (isPvc) {
    return (
      <>
        <h2 className="page-title" style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
          Factory Rent
        </h2>
        <div className="table-wrap">
          <table style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "4.5rem" }} />
              <col style={{ width: "8rem" }} />
              <col />
              <col style={{ width: "8rem" }} />
              <col style={{ width: "10rem" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="is-center">S.No</th>
                <th>Months</th>
                <th className="is-right">Covered Area</th>
                <th className="is-right">Rate</th>
                <th className="is-right">Rent Exp</th>
              </tr>
            </thead>
            <tbody>
              {registerRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No rows yet.
                  </td>
                </tr>
              ) : (
                registerRows.map((r, i) => (
                  <tr key={`rent-${r.id}`}>
                    <td className="is-center">{i + 1}</td>
                    <td>{formatMonthLabel(r.month)}</td>
                    <td className="is-right">
                      {r.coveredAreaSqft == null
                        ? "—"
                        : `${Number(r.coveredAreaSqft).toLocaleString("en-IN")} SQFT`}
                    </td>
                    <td className="is-right">
                      {r.rentRatePerSqft == null
                        ? "—"
                        : Number(r.rentRatePerSqft).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                    </td>
                    <td className="is-right">
                      {Number(r.rentAmount) > 0
                        ? formatINR(r.rentAmount)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h2 className="page-title" style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
          Electricity & Power Expense
        </h2>
        <div className="table-wrap">
          <table style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr>
                <th className="is-center">S No.</th>
                <th>Months</th>
                <th className="is-right">Opening Reading</th>
                <th className="is-right">Closing Reading</th>
                <th className="is-right">Consumed Reading</th>
                <th className="is-right">Amount of electricity bill</th>
              </tr>
            </thead>
            <tbody>
              {registerRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No rows yet.
                  </td>
                </tr>
              ) : (
                registerRows.map((r, i) => (
                  <tr key={`elec-${r.id}`}>
                    <td className="is-center">{i + 1}</td>
                    <td>{formatMonthLabel(r.month)}</td>
                    <td className="is-right">
                      {r.openingReading == null
                        ? "—"
                        : Number(r.openingReading).toLocaleString("en-IN")}
                    </td>
                    <td className="is-right">
                      {r.closingReading == null
                        ? "—"
                        : Number(r.closingReading).toLocaleString("en-IN")}
                    </td>
                    <td className="is-right">
                      {r.consumedUnits == null
                        ? "—"
                        : Number(r.consumedUnits).toLocaleString("en-IN")}
                    </td>
                    <td className="is-right">
                      {Number(r.billAmount) > 0
                        ? formatINR(r.billAmount)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div className="table-wrap" style={{ marginTop: "1.25rem" }}>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Units</th>
            <th>Bill</th>
            <th>Rent</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="empty">
                No rows yet.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{String(r.month).slice(0, 7)}</td>
                <td>{r.consumedUnits ?? "—"}</td>
                <td>{formatINR(r.billAmount)}</td>
                <td>{formatINR(r.rentAmount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
