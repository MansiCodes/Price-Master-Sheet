import { formatINR } from "@/lib/format/inr";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { type ReportColumn } from "@/components/pnl/ReportTable";
import { formatDayMonthYear } from "@/lib/dates";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import {
  parseUpcastStockNotes,
  stockEntryTypeLabel,
} from "@/lib/plant-catalogs";
import { formatQty, isoDate } from "@/components/pnl/stock-report/format";
import type { StockRow } from "@/components/pnl/stock-report/types";

export function buildDefaultStockColumns(
  isUpcast: boolean,
): ReportColumn<StockRow>[] {
  return [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
    {
      key: "category",
      label: "Category",
      compact: true,
      render: (r) => r.category || "—",
    },
    ...(isUpcast
      ? []
      : ([
          {
            key: "entryType",
            label: "Type",
            compact: true,
            render: (r: StockRow) => stockEntryTypeLabel(r.notes),
          },
        ] satisfies ReportColumn<StockRow>[])),
    { key: "item", label: "Item", render: (r) => r.itemName },
    ...(isUpcast
      ? ([
          {
            key: "opening",
            label: "Opening Stock",
            align: "right",
            render: (r: StockRow) => {
              const { meta } = parseUpcastStockNotes(r.notes);
              return meta ? `${formatQty(meta.opening)} ${r.unit || "KGS"}` : "—";
            },
          },
          {
            key: "incoming",
            label: "Incoming Stock",
            align: "right",
            render: (r: StockRow) => {
              const { meta } = parseUpcastStockNotes(r.notes);
              return meta ? `${formatQty(meta.incoming)} ${r.unit || "KGS"}` : "—";
            },
          },
          {
            key: "outward",
            label: "Outward Stock",
            align: "right",
            render: (r: StockRow) => {
              const { meta } = parseUpcastStockNotes(r.notes);
              return meta ? `${formatQty(meta.outward)} ${r.unit || "KGS"}` : "—";
            },
          },
          {
            key: "scrapSorting",
            label: "Scrap & Sorting",
            align: "right",
            render: (r: StockRow) => {
              const { meta } = parseUpcastStockNotes(r.notes);
              if (!meta || meta.totalScrapWeight == null) return "—";
              return (
                <div style={{ textAlign: "right", fontSize: "0.8rem", lineHeight: "1.2" }}>
                  <div>Scrap: {formatQty(meta.totalScrapWeight)} kg</div>
                  {meta.pettyQty != null && meta.weightPerPetty != null && (
                    <div style={{ color: "#64748b" }}>
                      Petty: {meta.pettyQty} × {meta.weightPerPetty} = {meta.totalPettyWeight ?? (meta.pettyQty * meta.weightPerPetty)} kg
                    </div>
                  )}
                  {meta.sortingLossWeight != null && meta.sortingLossWeight > 0 && (
                    <div style={{ color: "#0f766e", fontWeight: 600 }}>
                      Sort Loss: {formatQty(meta.sortingLossWeight)} kg
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "burningStage",
            label: "Burning Stage",
            align: "right",
            render: (r: StockRow) => {
              const { meta } = parseUpcastStockNotes(r.notes);
              if (!meta || (meta.burningLossWeight == null && meta.weightAfterBurning == null)) return "—";
              return (
                <div style={{ textAlign: "right", fontSize: "0.8rem", lineHeight: "1.2" }}>
                  {meta.burningLossWeight != null && (
                    <div style={{ color: "#0d9488" }}>Burn Loss: {formatQty(meta.burningLossWeight)} kg</div>
                  )}
                  {meta.weightAfterBurning != null && (
                    <div style={{ fontWeight: 600, color: "#0f766e" }}>After Burn: {formatQty(meta.weightAfterBurning)} kg</div>
                  )}
                </div>
              );
            },
          },
          {
            key: "outputBreakdown",
            label: "Production Output",
            align: "right",
            render: (r: StockRow) => {
              const { meta } = parseUpcastStockNotes(r.notes);
              if (!meta || meta.totalOutputWeight == null) return "—";
              return (
                <div style={{ textAlign: "right", fontSize: "0.8rem", lineHeight: "1.2" }}>
                  {meta.rod8mmWeight != null && meta.rod8mmWeight > 0 && <div>8mm: {formatQty(meta.rod8mmWeight)} kg</div>}
                  {meta.wire8mmTo1_6mmWeight != null && meta.wire8mmTo1_6mmWeight > 0 && <div>8→1.6mm: {formatQty(meta.wire8mmTo1_6mmWeight)} kg</div>}
                  {meta.wire1_6mmWeight != null && meta.wire1_6mmWeight > 0 && <div>1.6mm: {formatQty(meta.wire1_6mmWeight)} kg</div>}
                  <div style={{ fontWeight: 700, borderTop: "1px solid #ccfbf1", marginTop: "2px", paddingTop: "2px" }}>
                    Total: {formatQty(meta.totalOutputWeight)} kg
                  </div>
                  {meta.castingLossWeight != null && meta.castingLossWeight > 0 && (
                    <div style={{ color: "#0f766e" }}>Cast Loss: {formatQty(meta.castingLossWeight)} kg</div>
                  )}
                </div>
              );
            },
          },
        ] satisfies ReportColumn<StockRow>[])
      : []),
    {
      key: "qty",
      label: isUpcast ? "Closing Stock" : "Qty",
      align: "right",
      render: (r) => `${Number(r.quantity)} ${r.unit}`,
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
