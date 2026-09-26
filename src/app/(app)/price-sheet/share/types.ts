import type { CableRate } from "@/lib/sheets/types";

export type SavedRecipient = {
  id: string;
  phone: string;
  label: string | null;
};

export type ShareModalProps = {
  open: boolean;
  selectedRows: CableRate[];
  onClose: () => void;
  onShared: () => void;
};

export const PREVIEW_LIMIT = 3;
