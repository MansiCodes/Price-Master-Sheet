export const PAGE_SIZES = [10, 20, 50, 100, 200] as const;
export const PAGE_SIZE_LABELS = PAGE_SIZES.map(String);
export const BULK_SELECT_OPTIONS = ["Select All", "Deselect All"] as const;
export const AUTO_SYNC_MS = 60_000;

export function formatPrice(value: number): string {
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function csvEscape(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function downloadRatesCsv(
  rows: Array<{
    sNo: number | null;
    name: string;
    rmCostingPerBox: number;
    rmCostingPerMtr: number;
    p10: number;
    p12: number;
    p15: number;
    p20: number;
  }>,
): void {
  if (!rows.length) return;
  const header = [
    "S NO.",
    "NAME OF CABLE",
    "RM Costing (Per Box=305Mtr)",
    "Price per meter",
    "P=10%",
    "P=12%",
    "P=15%",
    "P=20%",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvEscape(row.sNo ?? ""),
        csvEscape(row.name),
        csvEscape(row.rmCostingPerBox),
        csvEscape(row.rmCostingPerMtr),
        csvEscape(row.p10),
        csvEscape(row.p12),
        csvEscape(row.p15),
        csvEscape(row.p20),
      ].join(","),
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cable-rates-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildPageList(total: number, currentPage: number, compact: boolean): number[] {
  if (total <= 1) return [1];

  if (compact) {
    // Sliding window of 2 pages (e.g. 2,3 … → 3,4 …) so mobile never crowds.
    if (total <= 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start =
      currentPage >= total ? Math.max(1, total - 1) : Math.max(1, currentPage);
    return [start, start + 1].filter((p) => p <= total);
  }

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set([1, total, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}
