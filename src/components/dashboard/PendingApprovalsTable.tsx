"use client";

import { useState } from "react";
import { ApproveRejectGroup } from "@/components/dashboard/ApproveRejectGroup";
import { ShiftDetailsModal } from "@/components/dashboard/ShiftDetailsModal";
import { localeToBcp47, type AppLocale } from "@/i18n/config";

type ApprovalItem = {
  id: string;
  plantId: string;
  date: string;
  shift: string;
  plant: { name: string };
};

type PendingApprovalsTableProps = {
  pendingApprovals: ApprovalItem[];
  userRole?: string;
  locale: AppLocale;
};

function formatDay(dateStr: string, locale: AppLocale): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(localeToBcp47(locale), {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function PendingApprovalsTable({
  pendingApprovals,
  locale,
}: PendingApprovalsTableProps) {
  const [selectedShift, setSelectedShift] = useState<ApprovalItem | null>(null);

  return (
    <>
      <section className="mis-panel" style={{ marginTop: "1.25rem", padding: "1.25rem" }}>
        <h2 className="section-label" style={{ marginBottom: "1rem" }}>
          Pending Shift Approvals
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table className="approvals-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color, #e5e7eb)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Date</th>
                <th style={{ padding: "0.5rem" }}>Shift</th>
                <th style={{ padding: "0.5rem" }}>Plant</th>
                <th style={{ padding: "0.5rem" }}>Status</th>
                <th style={{ padding: "0.5rem", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.map((app) => {
                const dateFormatted = formatDay(app.date.slice(0, 10), locale);

                return (
                  <tr key={app.id} style={{ borderBottom: "1px solid var(--border-color, #f3f4f6)" }}>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{dateFormatted}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span style={{ textTransform: "capitalize" }}>{app.shift.toLowerCase()}</span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{app.plant.name}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "#d9770615",
                          color: "#d97706",
                        }}
                      >
                        Pending Business Head
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedShift(app)}
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            color: "#0f766e",
                            backgroundColor: "#f0fdfa",
                            border: "1px solid #99f6e4",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                          }}
                        >
                          View Details
                        </button>
                        <ApproveRejectGroup
                          statusId={app.id}
                          role="BUSINESS_HEAD"
                          approveAction="approve_head"
                          rejectAction="reject_head"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedShift && (
        <ShiftDetailsModal
          open={true}
          onClose={() => setSelectedShift(null)}
          plantId={selectedShift.plantId}
          plantName={selectedShift.plant.name}
          date={selectedShift.date}
          shift={selectedShift.shift}
        />
      )}
    </>
  );
}
