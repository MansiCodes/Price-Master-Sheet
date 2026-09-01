type ApprovalRow = {
  approvalRequired?: boolean;
  shiftComplete?: boolean;
  approvedByHead?: boolean;
  approvedByAdmin?: boolean;
  rejectedByHead?: boolean;
  rejectedByAdmin?: boolean;
  rejectionReason?: string | null;
};

export function pnlApprovalBadge(
  row: ApprovalRow,
  level: "head" | "admin",
): { label: string; bg: string; fg: string; title?: string } {
  if (row.approvalRequired === false) {
    return { label: "—", bg: "#f3f4f6", fg: "#9ca3af" };
  }

  const isRejected = level === "head" ? row.rejectedByHead : row.rejectedByAdmin;
  const isApproved = level === "head" ? row.approvedByHead : row.approvedByAdmin;

  if (isRejected) {
    return {
      label: "Rejected",
      bg: "#ef444415",
      fg: "#ef4444",
      title: row.rejectionReason ?? undefined,
    };
  }
  if (isApproved) {
    return { label: "Approved", bg: "#10b98115", fg: "#10b981" };
  }

  return level === "head"
    ? { label: "Pending", bg: "#d9770615", fg: "#d97706" }
    : { label: "Pending", bg: "#3b82f615", fg: "#3b82f6" };
}
