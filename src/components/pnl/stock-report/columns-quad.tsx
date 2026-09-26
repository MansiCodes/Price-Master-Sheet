import { formatINR } from "@/lib/format/inr";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { type ReportColumn } from "@/components/pnl/ReportTable";
import { formatDayMonthYear } from "@/lib/dates";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
} from "@/lib/plant-catalogs";
import { formatQty, isoDate } from "@/components/pnl/stock-report/format";
import type { StockRow } from "@/components/pnl/stock-report/types";

export function buildQuadRawStockColumns(
  page: number,
  pageSize: number,
): ReportColumn<StockRow>[] {
  return [
    {
      key: "s",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "date",
      label: "Date",
      align: "center",
      compact: true,
      render: (r) => isoDate(r.date),
    },
    {
      key: "item",
      label: "Item",
      wrap: true,
      render: (r) => r.itemName,
    },
    {
      key: "qty",
      label: "Qty",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.quantity, 4),
    },
    {
      key: "unit",
      label: "Unit",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      render: (r) =>
        r.rate != null && r.rate !== "" ? formatINR(Number(r.rate)) : "—",
    },
    {
      key: "value",
      label: "Value",
      align: "right",
      render: (r) => formatINR(r.closingValue),
    },
    {
      key: "excelUploadedAt",
      label: "Excel upload",
      compact: true,
      render: (r) =>
        r.excelUploadedAt ? formatDayMonthYear(r.excelUploadedAt) : "—",
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
    },
    {
      key: "photos",
      label: "Image",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];
}

export function buildQuadCableStockColumns(
  page: number,
  pageSize: number,
): ReportColumn<StockRow>[] {
  return [
    {
      key: "s",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "date",
      label: "Date",
      align: "center",
      compact: true,
      render: (r) => isoDate(r.date),
    },
    {
      key: "item",
      label: "Item",
      wrap: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (meta?.kind === "cable") return meta.cable || r.itemName;
        const parts = r.itemName.split(" · ");
        return parts[0] || r.itemName;
      },
    },
    {
      key: "size",
      label: "Size",
      wrap: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (meta?.kind === "cable") return meta.size || "—";
        const parts = r.itemName.split(" · ");
        return parts.length > 1 ? parts.slice(1).join(" · ") : "—";
      },
    },
    {
      key: "process",
      label: "Process WIP",
      wrap: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (!meta || meta.kind !== "cable") return "—";
        const procs = getQuadSignalCableProcesses(meta.cable ?? "");
        const production = meta.production ?? {};
        const opening = meta.opening ?? {};
        const closing = meta.closing ?? meta.processes ?? {};
        if (
          Object.keys(closing).length === 0 &&
          Object.keys(production).length === 0
        ) {
          return "—";
        }
        const lines = (procs.length ? procs : Object.keys(closing)).map(
          (name) => {
            const o = opening[name];
            const p = production[name];
            const c = closing[name];
            const bits: string[] = [name];
            if (o != null) bits.push(`O:${o}`);
            if (p != null) bits.push(`P:${p}`);
            if (c != null) bits.push(`C:${c}`);
            return bits.join(" ");
          },
        );
        return lines.join(" · ");
      },
    },
    {
      key: "callPutup",
      label: "Call putup qty",
      align: "right",
      compact: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (meta?.kind !== "cable") return "—";
        return meta.callPutup?.trim() || "—";
      },
    },
    {
      key: "putupDate",
      label: "Put up date",
      align: "center",
      compact: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (meta?.kind !== "cable") return "—";
        const raw = meta.putupDate?.trim();
        if (!raw) return "—";
        return isoDate(raw);
      },
    },
    {
      key: "partyName",
      label: "Call putup party",
      wrap: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (meta?.kind !== "cable") return "—";
        return meta.partyName?.trim() || "—";
      },
    },
    {
      key: "dispatchPending",
      label: "Dispatch qty",
      align: "right",
      compact: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (meta?.kind !== "cable") return "—";
        if (meta.dispatchPending == null) return "—";
        return formatQty(meta.dispatchPending, 2);
      },
    },
    {
      key: "dispatchParty",
      label: "Dispatch party",
      wrap: true,
      render: (r) => {
        const { meta } = parseQuadSignalStockNotes(r.notes);
        if (meta?.kind !== "cable") return "—";
        return (
          meta.dispatchParty?.trim() ||
          meta.partyName?.trim() ||
          "—"
        );
      },
    },
    {
      key: "qty",
      label: "Qty",
      align: "right",
      compact: true,
      render: (r) => `${Number(r.quantity)}`,
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      render: (r) =>
        r.rate != null && r.rate !== "" ? formatINR(Number(r.rate)) : "—",
    },
    {
      key: "value",
      label: "Value",
      align: "right",
      render: (r) => formatINR(r.closingValue),
    },
    {
      key: "excelUploadedAt",
      label: "Excel upload",
      compact: true,
      render: (r) =>
        r.excelUploadedAt ? formatDayMonthYear(r.excelUploadedAt) : "—",
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
    },
    {
      key: "photos",
      label: "Image",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];
}
