"use client";

import { formatINR } from "@/lib/format/inr";
import type { ShiftDetailsData, ShiftDetailsTab } from "./shift-details-types";

export function ShiftDetailsBody({
  loading,
  error,
  data,
  activeTab,
}: {
  loading: boolean;
  error: string | null;
  data: ShiftDetailsData | null;
  activeTab: ShiftDetailsTab;
}) {
  return (
    <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", minHeight: "300px" }}>
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: "200px" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading shift details...</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fee2e2",
            borderRadius: "0.375rem",
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {activeTab === "sales" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#4b5563" }}>
                    <th style={{ padding: "0.5rem" }}>Customer</th>
                    <th style={{ padding: "0.5rem" }}>Item details</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Qty</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Rate</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Sales value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>
                        No sales entries in this shift.
                      </td>
                    </tr>
                  ) : (
                    data.sales.map((s) => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem 0.5rem" }}>{s.customerName}</td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>{s.itemDescription}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{Number(s.quantity).toLocaleString()} {s.unit}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{formatINR(Number(s.rate))}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: 600 }}>{formatINR(Number(s.salesValue))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "purchases" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#4b5563" }}>
                    <th style={{ padding: "0.5rem" }}>Vendor</th>
                    <th style={{ padding: "0.5rem" }}>Invoice no.</th>
                    <th style={{ padding: "0.5rem" }}>Item details</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Qty</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Rate</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Basic value</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Invoice value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>
                        No purchase entries in this shift.
                      </td>
                    </tr>
                  ) : (
                    data.purchases.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem 0.5rem" }}>{p.vendorName}</td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          {p.billNumber?.trim() || "—"}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>{p.itemDescription}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{Number(p.quantity).toLocaleString()} {p.unit}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{formatINR(Number(p.rate))}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{formatINR(Number(p.basicValue))}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: 600 }}>{formatINR(Number(p.invoiceValue))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "stock" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#4b5563" }}>
                    <th style={{ padding: "0.5rem" }}>Item name</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Closing stock</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Rate</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Closing value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stocks.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>
                        No stock entries in this shift.
                      </td>
                    </tr>
                  ) : (
                    data.stocks.map((s) => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem 0.5rem" }}>{s.itemName}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{Number(s.quantity).toLocaleString()} {s.unit}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{formatINR(Number(s.rate))}</td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: 600 }}>{formatINR(Number(s.closingValue))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "expenses" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#4b5563" }}>
                    <th style={{ padding: "0.5rem" }}>Category</th>
                    <th style={{ padding: "0.5rem" }}>Pay mode</th>
                    <th style={{ padding: "0.5rem" }}>Remarks</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pettyCash.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>
                        No expense entries in this shift.
                      </td>
                    </tr>
                  ) : (
                    data.pettyCash.map((e) => {
                      const total = Number(e.amount) + Number(e.contractorSalary) + Number(e.supervisorSalary);
                      return (
                        <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.75rem 0.5rem" }}>{e.expenseHead}</td>
                          <td style={{ padding: "0.75rem 0.5rem" }}>{e.payMode}</td>
                          <td style={{ padding: "0.75rem 0.5rem" }}>{e.description || "—"}</td>
                          <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: 600 }}>{formatINR(total)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
