"use client";

import { useEffect, useState } from "react";
import { ShiftDetailsBody } from "./ShiftDetailsBody";
import type {
  ShiftDetailsData,
  ShiftDetailsModalProps,
  ShiftDetailsTab,
} from "./shift-details-types";

export function ShiftDetailsModal({
  open,
  onClose,
  plantName,
  date,
  shift,
  plantId,
}: ShiftDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<ShiftDetailsTab>("sales");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShiftDetailsData | null>(null);

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

        <ShiftDetailsBody
          loading={loading}
          error={error}
          data={data}
          activeTab={activeTab}
        />

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
