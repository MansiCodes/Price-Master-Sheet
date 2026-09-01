"use client";

import { pnlApprovalBadge } from "@/lib/pnl/approval-badge";

type PnlApprovalBadgeProps = {
  row: {
    approvalRequired?: boolean;
    approvedByHead?: boolean;
    approvedByAdmin?: boolean;
    rejectedByHead?: boolean;
    rejectedByAdmin?: boolean;
    rejectionReason?: string | null;
  };
  level: "head" | "admin";
};

export function PnlApprovalBadge({ row, level }: PnlApprovalBadgeProps) {
  const badge = pnlApprovalBadge(row, level);
  return (
    <span
      title={badge.title}
      style={{
        display: "inline-block",
        padding: "0.15rem 0.4rem",
        borderRadius: "0.25rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: badge.bg,
        color: badge.fg,
      }}
    >
      {badge.label}
    </span>
  );
}
