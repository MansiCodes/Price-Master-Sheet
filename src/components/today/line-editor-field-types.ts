import type { LineItem } from "@/components/today/today-hub-model";

export type LineEditorFieldProps = {
  line: LineItem;
  idx: number;
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  unitOptions?: readonly string[];
  showGst: boolean;
  rateLabel: string;
};

export function patchLine(
  lines: LineItem[],
  idx: number,
  line: LineItem,
  onChange: (lines: LineItem[]) => void,
  patch: Partial<LineItem>,
) {
  const next = [...lines];
  next[idx] = { ...line, ...patch };
  onChange(next);
}
