"use client";

import Link from "next/link";
import { ApproveRejectGroup } from "@/components/dashboard/ApproveRejectGroup";
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
  /** When true (Approvals page), show Approve/Reject. Dashboard only has View all. */
  allowDecide?: boolean;
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
  allowDecide = false,
}: PendingApprovalsTableProps) {
  return (
    <section className="mis-panel" style={{ marginTop: "1.25rem", padding: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <h2 className="section-label" style={{ margin: 0 }}>
          Pending Shift Approvals
        </h2>
        {!allowDecide ? (
          <Link
            href="/approvals?tab=shift"
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#0f766e",
              textDecoration: "none",
            }}
          >
            View all
          </Link>
        ) : null}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          className="approvals-table"
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid var(--border-color, #e5e7eb)",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "0.5rem" }}>Date</th>
              <th style={{ padding: "0.5rem" }}>Shift</th>
              <th style={{ padding: "0.5rem" }}>Plant</th>
              <th style={{ padding: "0.5rem" }}>Status</th>
              {allowDecide ? (
                <th style={{ padding: "0.5rem", textAlign: "right" }}>Action</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pendingApprovals.map((app) => {
              const dateFormatted = formatDay(app.date.slice(0, 10), locale);

              return (
                <tr
                  key={app.id}
                  style={{
                    borderBottom: "1px solid var(--border-color, #f3f4f6)",
                  }}
                >
                  <td style={{ padding: "0.75rem 0.5rem" }}>{dateFormatted}</td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <span style={{ textTransform: "capitalize" }}>
                      {app.shift.toLowerCase()}
                    </span>
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
                      Pending Super Admin
                    </span>
                  </td>
                  {allowDecide ? (
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <ApproveRejectGroup
                          statusId={app.id}
                          role="SUPER_ADMIN"
                          approveAction="approve_head"
                          rejectAction="reject_head"
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
