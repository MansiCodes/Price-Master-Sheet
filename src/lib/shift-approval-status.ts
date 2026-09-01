import { isShiftApprovalRequired } from "@/lib/shift-approval-policy";

export type ShiftApprovalSnapshot = {
  id?: string;
  allComplete: boolean;
  purchaseFilled: boolean;
  saleFilled: boolean;
  stockFilled: boolean;
  pettyCashFilled: boolean;
  productionFilled: boolean;
  approvedByHead: boolean;
  approvedByAdmin: boolean;
  rejectedByHead: boolean;
  rejectedByAdmin: boolean;
  rejectionReason?: string | null;
};

export type ShiftApprovalLabel = {
  label: string;
  tone: "muted" | "warning" | "info" | "success" | "danger";
  reason?: string | null;
};

export function formatShiftApprovalStatus(
  status: ShiftApprovalSnapshot | null | undefined,
  entryDate?: Date | string | null,
): ShiftApprovalLabel {
  if (entryDate != null && !isShiftApprovalRequired(entryDate)) {
    return { label: "—", tone: "muted" };
  }
  if (!status) {
    return { label: "Not started", tone: "muted" };
  }
  if (status.rejectedByAdmin || status.rejectedByHead) {
    return {
      label: "Rejected",
      tone: "danger",
      reason: status.rejectionReason,
    };
  }
  const anyFilled =
    status.purchaseFilled ||
    status.saleFilled ||
    status.stockFilled ||
    status.pettyCashFilled ||
    status.productionFilled;
  if (!anyFilled) {
    return { label: "Not started", tone: "muted" };
  }
  if (!status.allComplete) {
    const done = [
      status.purchaseFilled,
      status.saleFilled,
      status.stockFilled,
      status.pettyCashFilled,
    ].filter(Boolean).length;
    return {
      label: `In progress (${done}/4 required)`,
      tone: "muted",
    };
  }
  if (!status.approvedByHead) {
    return { label: "Pending Business Head", tone: "warning" };
  }
  return { label: "Approved", tone: "success" };
}
