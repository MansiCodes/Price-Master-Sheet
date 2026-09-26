import { GlobalRole, ManpowerShift, type PrismaClient } from "@prisma/client";
import { entryApprovalCreateData } from "@/lib/entry-approval";
import { plantIdFilter } from "@/lib/plant-merge";

export type ImportSummary = {
  batchId: string;
  uploadedAt: string;
  sales: number;
  purchases: number;
  stock: number;
  expenses: number;
  electricity: number;
  rent: number;
  far: number;
  /** Rows skipped because the same data already exists (nothing to fill). */
  duplicates: number;
  /** Existing rows that received previously empty fields from this file. */
  updated: number;
  /** True when every row in the file was already present and nothing was filled. */
  alreadyUploaded: boolean;
  skipped: { sheet: string; row: number; reason: string }[];
  sheetsFound: string[];
};

export type PersistCtx = {
  prisma: PrismaClient;
  writePlantId: string;
  enteredById: string;
  role: GlobalRole;
  familyKey: string;
  pScope: ReturnType<typeof plantIdFilter>;
  uploadedAt: Date;
  summary: ImportSummary;
  seenKeys: Set<string>;
  daysToRefresh: Map<string, ManpowerShift>;
  markDuplicate: (sheet: string, row: number, reason: string) => void;
};

export function isBlankText(v: string | null | undefined): boolean {
  return v == null || String(v).trim() === "";
}

export function approvalFor(role: GlobalRole, dateYmd: string) {
  return entryApprovalCreateData(role, dateYmd);
}
