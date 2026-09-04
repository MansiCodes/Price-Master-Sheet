"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format/inr";

type ShiftDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  plantName: string;
  date: string;
  shift: string;
  plantId: string;
};

type SaleDetail = {
  id: string;
  customerName: string;
  itemDescription: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  salesValue: number | string;
};

type PurchaseDetail = {
  id: string;
  vendorName: string;
  billNumber?: string | null;
  itemDescription: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  basicValue: number | string;
  invoiceValue: number | string;
};

type StockDetail = {
  id: string;
  itemName: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  closingValue: number | string;
};

type PettyCashDetail = {
  id: string;
  expenseHead: string;
  payMode: string;
  description: string | null;
  amount: number | string;
  contractorSalary: number | string;
  supervisorSalary: number | string;
};

export function ShiftDetailsModal({
  open,
  onClose,
  plantName,
  date,
  shift,
  plantId,
}: ShiftDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"sales" | "purchases" | "stock" | "expenses">("sales");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    sales: SaleDetail[];
    purchases: PurchaseDetail[];
    stocks: StockDetail[];
    pettyCash: PettyCashDetail[];
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setData(null);

    const dateOnly = date.slice(0, 10);
    fetch(`/api/admin/completion/details?plantId=${plantId}&date=${dateOnly}&shift=${shift}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load shift details");
        return res.json();
      })
      .then((json) => {
        if (!json.ok) throw new Error(json.error || "Failed to load shift details");
        setData({
          sales: json.sales || [],
          purchases: json.purchases || [],
          stocks: json.stocks || [],
          pettyCash: json.pettyCash || [],
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load shift details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, plantId, date, shift]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: "0.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600, color: "#111827" }}>
              Shift Data Verification
            </h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              {plantName} · {date.slice(0, 10)} · {shift} Shift
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            padding: "0.5rem 1rem 0 1rem",
          }}
        >
          {(["sales", "purchases", "stock", "expenses"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: activeTab === tab ? "#0f766e" : "#4b5563",
                borderBottom: activeTab === tab ? "2px solid #0f766e" : "2px solid transparent",
                background: "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body Content */}
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

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            display: "flex",
            justifyContent: "flex-end",
            borderRadius: "0 0 0.5rem 0.5rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
