export type EntryApprovalKind = "purchase" | "sale" | "stock" | "expense";

export type EntryApprovalRow = {
  date: Date | string;
  approvedByHead?: boolean;
  approvedByAdmin?: boolean;
  rejectedByHead?: boolean;
  rejectionReason?: string | null;
};

export type EntryApprovalFlags = {
  approvedByHead: boolean;
  approvedByAdmin: boolean;
  rejectedByHead: boolean;
  rejectedByAdmin: boolean;
  approvalRequired: boolean;
};
