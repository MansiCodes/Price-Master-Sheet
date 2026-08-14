"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { postJson, todayLocalISO } from "@/lib/client-forms";
import { formatINR } from "@/lib/format/inr";
import {
  OPEN_TODAY_ENTRY_EVENT,
  readStoredEntryDate,
} from "@/lib/today-entry";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { SlideOver } from "@/components/ui/SlideOver";
import { BillUpload } from "@/components/today/BillUpload";
import { PRODUCT_UNITS } from "@/lib/units";
import "./today-hub.css";

export type TodayModuleKey =
  | "purchaseFilled"
  | "saleFilled"
  | "stockFilled"
  | "productionFilled"
  | "pettyCashFilled";

export type TodayModuleStatus = {
  key: TodayModuleKey;
  label: string;
  filled: boolean;
  done?: number;
  total?: number;
};

export type ShiftKey = "DAY" | "NIGHT";

export type ShiftModulesMap = Record<ShiftKey, TodayModuleStatus[]>;

const MODULE_ICONS: Record<
  TodayModuleKey,
  { path: string; tone: "teal" }
> = {
  purchaseFilled: {
    tone: "teal",
    path: "M3 5h2l1.6 9.6a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6M9 20a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 9 20Zm8 0a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 17 20Z",
  },
  saleFilled: {
    tone: "teal",
    path: "M3 17l6-6 4 4 8-8M15 7h6v6",
  },
  stockFilled: {
    tone: "teal",
    path: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7 12 12l8.7-5 M12 22V12",
  },
  productionFilled: {
    tone: "teal",
    path: "M3 21V10l6-4v4l6-4v15M15 21V12l6 3v6M3 21h18",
  },
  pettyCashFilled: {
    tone: "teal",
    path: "M3 7h18v11H3V7Zm0 0 2-3h14l2 3M15 12.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  },
};

const MODULE_KIND: Record<TodayModuleKey, EntryKind> = {
  purchaseFilled: "purchase",
  saleFilled: "sale",
  stockFilled: "stock",
  productionFilled: "production",
  pettyCashFilled: "expense",
};

const KIND_TO_MODULE: Record<EntryKind, TodayModuleKey> = {
  purchase: "purchaseFilled",
  sale: "saleFilled",
  stock: "stockFilled",
  production: "productionFilled",
  expense: "pettyCashFilled",
};

type EntryKind = "purchase" | "sale" | "stock" | "production" | "expense";

const ENTRY_OPTIONS: { value: EntryKind; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sales" },
  { value: "stock", label: "Stock" },
  { value: "production", label: "Production" },
  { value: "expense", label: "Expense" },
];

type LineItem = {
  id: string;
  itemDescription: string;
  unit: string;
  quantity: string;
  rate: string;
  gstPercent: string;
};

const RAW_MATERIALS = [
  "INSU & OUT",
  "TAPE",
  "INSU",
  "DHAGA",
  "BOXES",
  "IN-PVC",
  "ALU",
  "Spool",
  "COPPER",
  "MASTER BATCH",
  "OT-PVC",
] as const;

const STOCK_ITEMS = [...RAW_MATERIALS, "Others"] as const;

const VENDORS = [
  "3R Polymers Private Limited",
  "Bells Insulations Private Ltd.",
  "Cablemac Automations India Pvt. Ltd",
  "Crown Trading C",
  "Goel Packers",
  "Hycount Cables Private Limited",
  "Paramhans Wires Private Limited",
  "Perfect Metals",
  "Pryas Wire Industries",
  "Sag Polymers Private Limited",
  "SINGHAL PRINT PACK",
  "Tirupati Plastics",
] as const;

const CUSTOMERS = [
  "Noto Fire",
  "Wirelux",
  "Samriddhii Automation Haridwar",
  "Samriddhi Automation Noida",
  "Railway PO ATC",
  "Hamsa India",
  "Peak Star Networking",
  "Glow Right",
  "Ayansh Infocom",
  "Qlo Networks",
  "Anu Exterprises",
  "Digamber Telecom",
  "Naitik Infotex",
  "Bharat Cable Industries",
  "Goa Shipping Yard",
  "Reliable securities",
  "Chrome Infra",
  "Epsillon Cable",
] as const;

const SALE_TYPES = [
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "ALUMINIUM_SCRAP", label: "Aluminium Scrap" },
  { value: "COPPER_SCRAP", label: "Copper Scrap" },
  { value: "OTHERS", label: "Others" },
] as const;

type SaleTypeValue = (typeof SALE_TYPES)[number]["value"];

const PURCHASE_TYPES = [
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "ASSET", label: "Asset" },
  { value: "CAPITAL_GOOD", label: "Capital Good" },
  { value: "RAW_MATERIAL", label: "Raw materials" },
  { value: "OTHERS", label: "Others" },
] as const;

type PurchaseTypeValue = (typeof PURCHASE_TYPES)[number]["value"];

const EXPENSE_HEADS = [
  "Electricity",
  "Transport",
  "Maintenance",
  "Office",
  "Miscellaneous",
] as const;

const PRODUCTS = [
  { name: "CAT6 Patch Cable Solid with Connectors", unit: "PCS" },
  { name: "Aluminium Wire", unit: "KGS" },
  { name: "CAT6 PATCH CABLE", unit: "PCS" },
  { name: "Copper Wire Rod", unit: "KGS" },
  { name: "Corrugated Box", unit: "NOS" },
  { name: "HDPE Compound", unit: "KGS" },
  { name: "MDPE Compound", unit: "KGS" },
  { name: "Plastic Granuals", unit: "KGS" },
  { name: "Polyster Yarn", unit: "KGS" },
  { name: "PVC Compound", unit: "KGS" },
  { name: "SPOOL", unit: "NOS" },
] as const;

const PRODUCT_NAMES = PRODUCTS.map((p) => p.name);

function newLine(unit = "Kg", itemDescription = ""): LineItem {
  return {
    id: crypto.randomUUID(),
    itemDescription,
    unit,
    quantity: "",
    rate: "",
    gstPercent: "18",
  };
}

type TodayHubProps = {
  plantId: string;
  plantName: string;
  plantCode: string;
  date: string;
  shiftModules: ShiftModulesMap;
  canEnter: boolean;
  /** When true, hide plant hero — parent Dashboard already shows it. */
  embedded?: boolean;
};

function moduleScore(mod: TodayModuleStatus) {
  return `${mod.done ?? (mod.filled ? 1 : 0)}/${mod.total ?? 1}`;
}

export function TodayHub({
  plantId,
  plantName,
  plantCode,
  date,
  shiftModules,
  canEnter,
  embedded = false,
}: TodayHubProps) {
  const router = useRouter();
  const today = useMemo(() => todayLocalISO(), []);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EntryKind>("purchase");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(shiftModules);
  const [reportShift, setReportShift] = useState<ShiftKey>("DAY");

  // Shared / purchase
  const [entryDate, setEntryDate] = useState(date || today);
  const [purchaseType, setPurchaseType] =
    useState<PurchaseTypeValue>("RAW_MATERIAL");
  const [purchaseTypeOther, setPurchaseTypeOther] = useState("");
  const [vendorName, setVendorName] = useState<(typeof VENDORS)[number] | "">(
    "",
  );
  const [billNumber, setBillNumber] = useState("");
  const [purchaseRemarks, setPurchaseRemarks] = useState("");
  const [billPhotos, setBillPhotos] = useState<string[]>([]);
  const [purchaseLines, setPurchaseLines] = useState<LineItem[]>([
    newLine("KGS", ""),
  ]);

  // Sale
  const [customerName, setCustomerName] = useState<(typeof CUSTOMERS)[number]>(
    CUSTOMERS[0],
  );
  const [saleType, setSaleType] = useState<SaleTypeValue>("FINISHED_GOOD");
  const [saleTypeOther, setSaleTypeOther] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleRemarks, setSaleRemarks] = useState("");
  const [invoicePhotos, setInvoicePhotos] = useState<string[]>([]);
  const [saleLines, setSaleLines] = useState<LineItem[]>([
    newLine(PRODUCTS[0].unit, PRODUCTS[0].name),
  ]);

  // Stock
  const [stockItem, setStockItem] = useState<string>(RAW_MATERIALS[0]);
  const [stockItemOther, setStockItemOther] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockValue, setStockValue] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [stockPhotos, setStockPhotos] = useState<string[]>([]);

  // Production
  const [shift, setShift] = useState<"DAY" | "NIGHT">("DAY");
  const [productName, setProductName] = useState<(typeof PRODUCT_NAMES)[number]>(
    PRODUCTS[0].name,
  );
  const [prodQty, setProdQty] = useState("");
  const [prodUnit, setProdUnit] = useState<(typeof PRODUCT_UNITS)[number]>(
    PRODUCTS[0].unit,
  );
  const [mgr, setMgr] = useState("1");
  const [ops, setOps] = useState("8");
  const [helpers, setHelpers] = useState("4");

  const manpowerCost =
    Number(mgr || 0) * 4000 + Number(ops || 0) * 1500 + Number(helpers || 0) * 800;

  // Expense
  const [expenseHead, setExpenseHead] =
    useState<(typeof EXPENSE_HEADS)[number] | string>("Electricity");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expensePhotos, setExpensePhotos] = useState<string[]>([]);

  const activeModules = checklist[reportShift];
  const activeCompleted = activeModules.filter((m) => m.filled).length;

  function openAdd(nextKind: EntryKind = "purchase", nextShift: ShiftKey = reportShift) {
    setError(null);
    setKind(nextKind);
    setShift(nextShift);
    setEntryDate(readStoredEntryDate() || date || today);
    setOpen(true);
  }

  useEffect(() => {
    if (!canEnter) return;

    function onOpenRequest() {
      openAdd();
    }

    window.addEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest);
    };
    // openAdd closes over latest date/today/canEnter via render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEnter, date, today]);

  useEffect(() => {
    if (!canEnter) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("addEntry") !== "1") return;
    openAdd();
    router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEnter]);

  function resetAll() {
    setPurchaseType("RAW_MATERIAL");
    setPurchaseTypeOther("");
    setVendorName("");
    setBillNumber("");
    setPurchaseRemarks("");
    setBillPhotos([]);
    setPurchaseLines([newLine("KGS", "")]);
    setCustomerName(CUSTOMERS[0]);
    setSaleType("FINISHED_GOOD");
    setSaleTypeOther("");
    setInvoiceNo("");
    setSaleRemarks("");
    setInvoicePhotos([]);
    setSaleLines([newLine(PRODUCTS[0].unit, PRODUCTS[0].name)]);
    setStockItem(RAW_MATERIALS[0]);
    setStockItemOther("");
    setStockQty("");
    setStockValue("");
    setStockNotes("");
    setStockPhotos([]);
    setShift("DAY");
    setProductName(PRODUCTS[0].name);
    setProdQty("");
    setProdUnit(PRODUCTS[0].unit);
    setMgr("1");
    setOps("8");
    setHelpers("4");
    setExpenseHead("Electricity");
    setExpenseAmount("");
    setPaidTo("");
    setExpenseDesc("");
    setExpensePhotos([]);
  }

  useEffect(() => {
    setChecklist((prev) => ({
      DAY: shiftModules.DAY.map((next) => {
        const current = prev.DAY.find((m) => m.key === next.key);
        if (current?.filled && !next.filled) return current;
        return next;
      }),
      NIGHT: shiftModules.NIGHT.map((next) => {
        const current = prev.NIGHT.find((m) => m.key === next.key);
        if (current?.filled && !next.filled) return current;
        return next;
      }),
    }));
  }, [shiftModules]);

  function markModuleFilled(moduleKey: TodayModuleKey, entryShift: ShiftKey) {
    setChecklist((prev) => ({
      ...prev,
      [entryShift]: prev[entryShift].map((mod) =>
        mod.key === moduleKey
          ? { ...mod, filled: true, done: 1, total: mod.total ?? 1 }
          : mod,
      ),
    }));
  }

  async function syncChecklistFromServer() {
    try {
      const res = await fetch(
        `/api/plants/${plantId}/today?date=${encodeURIComponent(date)}`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        shifts?: Record<
          ShiftKey,
          { modules: { key: TodayModuleKey; filled: boolean }[] }
        >;
      };
      if (!json.shifts) return;
      setChecklist((prev) => ({
        DAY: prev.DAY.map((mod) => {
          const remote = json.shifts?.DAY.modules.find((m) => m.key === mod.key);
          const filled = remote?.filled ?? mod.filled;
          return {
            ...mod,
            filled,
            done: filled ? Math.max(1, mod.total ?? 1) : 0,
            total: mod.total ?? 1,
          };
        }),
        NIGHT: prev.NIGHT.map((mod) => {
          const remote = json.shifts?.NIGHT.modules.find((m) => m.key === mod.key);
          const filled = remote?.filled ?? mod.filled;
          return {
            ...mod,
            filled,
            done: filled ? Math.max(1, mod.total ?? 1) : 0,
            total: mod.total ?? 1,
          };
        }),
      }));
    } catch {
      /* keep optimistic state */
    }
  }

  function closePanel() {
    setOpen(false);
    setKind("purchase");
    setError(null);
  }

  function fail(message: string) {
    setSaving(false);
    setError(message);
    toast.error(message);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let result: { ok: true; data: unknown } | { ok: false; error: string };

    if (kind === "purchase") {
      const items = purchaseLines
        .map((l) => ({
          itemDescription: l.itemDescription.trim(),
          unit: l.unit.trim() || "KGS",
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          gstPercent: Number(l.gstPercent) || 0,
        }))
        .filter((l) => l.itemDescription && l.quantity > 0);
      if (!vendorName.trim() || items.length === 0) {
        fail("Add supplier and at least one description item.");
        return;
      }
      if (purchaseType === "OTHERS" && !purchaseTypeOther.trim()) {
        fail("Describe the purchase type for Others.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/purchases`, {
        date: entryDate,
        shift,
        type: purchaseType,
        typeOther:
          purchaseType === "OTHERS" ? purchaseTypeOther.trim() : null,
        vendorName: vendorName.trim(),
        billNumber: billNumber || null,
        billDate: entryDate,
        notes: purchaseRemarks.trim() || null,
        billPhotoUrls: billPhotos,
        items,
      });
    } else if (kind === "sale") {
      const items = saleLines
        .map((l) => ({
          itemDescription: l.itemDescription.trim(),
          unit: l.unit.trim() || "PCS",
          quantity: Number(l.quantity),
          rate: Number(l.rate),
        }))
        .filter((l) => l.itemDescription && l.quantity > 0);
      if (!customerName.trim() || items.length === 0) {
        fail("Add customer and at least one product.");
        return;
      }
      if (saleType === "OTHERS" && !saleTypeOther.trim()) {
        fail("Describe the sales type for Others.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/sales`, {
        date: entryDate,
        shift,
        type: saleType,
        typeOther: saleType === "OTHERS" ? saleTypeOther.trim() : null,
        customerName: customerName.trim(),
        billNumber: invoiceNo || null,
        billDate: entryDate,
        notes: saleRemarks.trim() || null,
        billPhotoUrls: invoicePhotos,
        items,
      });
    } else if (kind === "stock") {
      const resolvedItem =
        stockItem === "Others" ? stockItemOther.trim() : stockItem.trim();
      if (!resolvedItem || stockQty === "" || stockValue === "") {
        fail(
          stockItem === "Others" && !stockItemOther.trim()
            ? "Enter the other item name."
            : "Enter item, quantity, and value.",
        );
        return;
      }
      if (!(Number(stockQty) >= 0) || !(Number(stockValue) >= 0)) {
        fail("Quantity and value must be zero or more.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/stock`, {
        date: entryDate,
        shift,
        itemName: resolvedItem,
        category: "RM",
        unit: "kg",
        quantity: Number(stockQty),
        value: Number(stockValue),
        notes: stockNotes.trim() || null,
        photoUrls: stockPhotos,
      });
    } else if (kind === "production") {
      if (!productName.trim() || !(Number(prodQty) > 0)) {
        fail("Enter product and production quantity.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/production`, {
        date: entryDate,
        shift,
        productName: productName.trim(),
        quantity: Number(prodQty),
        unit: prodUnit,
        manpower: {
          manager: Number(mgr) || 0,
          operator: Number(ops) || 0,
          helper: Number(helpers) || 0,
        },
      });
    } else {
      const amount = Number(expenseAmount);
      if (!(amount > 0) || !expenseHead) {
        fail("Enter category and amount.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/petty-cash`, {
        date: entryDate,
        shift,
        payMode: "CASH",
        expenseHead: String(expenseHead),
        description: [paidTo && `Paid to: ${paidTo}`, expenseDesc]
          .filter(Boolean)
          .join(" · ") || null,
        amount,
        contractorSalary: 0,
        supervisorSalary: 0,
        billPhotoUrls: expensePhotos,
      });
    }

    setSaving(false);
    if (!result.ok) {
      fail(result.error);
      return;
    }

    const labels: Record<EntryKind, string> = {
      purchase: "Purchase saved",
      sale: "Sales saved",
      stock: "Stock saved",
      production: "Production saved",
      expense: "Expense saved",
    };
    toast.success(labels[kind]);
    closePanel();
    resetAll();
    if (entryDate === date) {
      markModuleFilled(KIND_TO_MODULE[kind], shift);
    }
    void syncChecklistFromServer();
    router.refresh();
  }

  return (
    <div className={`today-hub ${embedded ? "today-hub--embedded" : ""}`}>
      {!embedded ? (
        <header className="today-hub__header">
          <div>
            <h1 className="today-hub__plant">{plantName}</h1>
            <p className="today-hub__meta">
              {plantCode} · {date}
            </p>
          </div>
          <span className="today-hub__deadline">Deadline 9:00 PM</span>
        </header>
      ) : null}

      <section className="today-card">
        <div className="today-card__head">
          <div className="today-card__head-main">
            <h2 className="today-card__title">Today&apos;s report</h2>
            <span className="today-card__progress">
              {activeCompleted}/{activeModules.length}
            </span>
          </div>
          <div className="shift-toggle today-card__shift-toggle" role="group" aria-label="Shift">
            <button
              type="button"
              className={reportShift === "DAY" ? "is-active" : ""}
              onClick={() => setReportShift("DAY")}
            >
              Day
            </button>
            <button
              type="button"
              className={reportShift === "NIGHT" ? "is-active" : ""}
              onClick={() => setReportShift("NIGHT")}
            >
              Night
            </button>
          </div>
        </div>

        <ul className="today-checklist">
          {activeModules.map((mod) => {
            const icon = MODULE_ICONS[mod.key];
            return (
              <li key={`${reportShift}-${mod.key}`}>
                <button
                  type="button"
                  className={`today-check ${mod.filled ? "today-check--done" : ""}`}
                  disabled={!canEnter}
                  onClick={() => openAdd(MODULE_KIND[mod.key], reportShift)}
                >
                  <span className={`today-check__icon today-check__icon--${icon.tone}`}>
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={icon.path} />
                    </svg>
                  </span>
                  <span className="today-check__label">{mod.label}</span>
                  <span className="today-check__score">{moduleScore(mod)}</span>
                  <span className="today-check__mark" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        <Link href={`/plants/${plantId}/pnl`} className="today-card__all">
          View All Reports →
        </Link>

        {!canEnter ? (
          <p className="page-sub" style={{ marginTop: "1rem", marginBottom: 0 }}>
            Viewer access — entries are read-only.
          </p>
        ) : null}
      </section>

      <SlideOver
        open={open}
        onClose={closePanel}
        title="Today's entry"
        footer={
          <>
            <Button variant="secondary" onClick={closePanel}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="today-entry-form"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {error ? <Alert type="error">{error}</Alert> : null}

        <form id="today-entry-form" className="form-grid" onSubmit={onSubmit}>
            <div className="form-grid three">
              <div className="field">
                <label htmlFor="entry-kind">Entry type</label>
                <SelectMenu
                  id="entry-kind"
                  value={
                    ENTRY_OPTIONS.find((o) => o.value === kind)?.label ?? "Purchase"
                  }
                  options={ENTRY_OPTIONS.map((o) => o.label)}
                  required
                  onChange={(label) => {
                    const next = ENTRY_OPTIONS.find((o) => o.label === label);
                    if (next) setKind(next.value);
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="entry-date">Date</label>
                <input
                  id="entry-date"
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Shift</label>
                <div className="shift-toggle">
                  <button
                    type="button"
                    className={shift === "DAY" ? "is-active" : ""}
                    onClick={() => setShift("DAY")}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    className={shift === "NIGHT" ? "is-active" : ""}
                    onClick={() => setShift("NIGHT")}
                  >
                    Night
                  </button>
                </div>
              </div>
            </div>

            {kind === "purchase" ? (
              <>
                <div className="field">
                  <label htmlFor="p-type">Type</label>
                  <SelectMenu
                    id="p-type"
                    value={
                      PURCHASE_TYPES.find((t) => t.value === purchaseType)
                        ?.label ?? "Raw materials"
                    }
                    options={PURCHASE_TYPES.map((t) => t.label)}
                    required
                    onChange={(label) => {
                      const next = PURCHASE_TYPES.find((t) => t.label === label);
                      if (next) {
                        setPurchaseType(next.value);
                        if (next.value !== "OTHERS") setPurchaseTypeOther("");
                      }
                    }}
                  />
                </div>
                {purchaseType === "OTHERS" ? (
                  <div className="field">
                    <label htmlFor="p-type-other">Other type</label>
                    <input
                      id="p-type-other"
                      required
                      placeholder="Specify purchase type"
                      value={purchaseTypeOther}
                      onChange={(e) => setPurchaseTypeOther(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="p-vendor">Supplier name</label>
                    <SelectMenu
                      id="p-vendor"
                      value={vendorName}
                      options={VENDORS}
                      required
                      placeholder="Select supplier"
                      onChange={(next) =>
                        setVendorName(next as (typeof VENDORS)[number])
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="p-bill">Bill no.</label>
                    <input
                      id="p-bill"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                    />
                  </div>
                </div>
                <LineEditor
                  lines={purchaseLines}
                  onChange={setPurchaseLines}
                  defaultUnit="KGS"
                  itemLabel="Description"
                  itemOptions={["", ...RAW_MATERIALS]}
                  itemPlaceholder="Select raw material"
                  unitOptions={PRODUCT_UNITS}
                  showGst
                />
                <div className="field">
                  <label htmlFor="p-remarks">Remarks</label>
                  <input
                    id="p-remarks"
                    value={purchaseRemarks}
                    onChange={(e) => setPurchaseRemarks(e.target.value)}
                    placeholder="Optional remarks"
                  />
                </div>
                <BillUpload urls={billPhotos} onChange={setBillPhotos} />
              </>
            ) : null}

            {kind === "sale" ? (
              <>
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="s-type">Type</label>
                    <SelectMenu
                      id="s-type"
                      value={
                        SALE_TYPES.find((t) => t.value === saleType)?.label ??
                        "Finished Good"
                      }
                      options={SALE_TYPES.map((t) => t.label)}
                      required
                      onChange={(label) => {
                        const next = SALE_TYPES.find((t) => t.label === label);
                        if (next) {
                          setSaleType(next.value);
                          if (next.value !== "OTHERS") setSaleTypeOther("");
                        }
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="s-cust">Customer</label>
                    <SelectMenu
                      id="s-cust"
                      value={customerName}
                      options={CUSTOMERS}
                      required
                      onChange={(next) =>
                        setCustomerName(next as (typeof CUSTOMERS)[number])
                      }
                    />
                  </div>
                </div>
                {saleType === "OTHERS" ? (
                  <div className="field">
                    <label htmlFor="s-type-other">Other type</label>
                    <input
                      id="s-type-other"
                      required
                      placeholder="Specify sales type"
                      value={saleTypeOther}
                      onChange={(e) => setSaleTypeOther(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="field">
                  <label htmlFor="s-inv">Invoice no.</label>
                  <input
                    id="s-inv"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>
                <LineEditor
                  lines={saleLines}
                  onChange={setSaleLines}
                  defaultUnit={PRODUCTS[0].unit}
                  itemLabel="Product name"
                  itemOptions={PRODUCT_NAMES}
                  unitOptions={PRODUCT_UNITS}
                  resolveUnitForItem={(name) =>
                    PRODUCTS.find((p) => p.name === name)?.unit
                  }
                />
                <div className="field">
                  <label htmlFor="s-remarks">Remarks</label>
                  <input
                    id="s-remarks"
                    value={saleRemarks}
                    onChange={(e) => setSaleRemarks(e.target.value)}
                    placeholder="e.g. Factory staff / Operator"
                  />
                </div>
                <BillUpload
                  label="Upload invoice"
                  urls={invoicePhotos}
                  onChange={setInvoicePhotos}
                />
              </>
            ) : null}

            {kind === "stock" ? (
              <>
                <div className="field">
                  <label htmlFor="st-item">Item</label>
                  <SelectMenu
                    id="st-item"
                    value={stockItem || RAW_MATERIALS[0]}
                    options={STOCK_ITEMS}
                    required
                    onChange={(next) => {
                      setStockItem(next);
                      if (next !== "Others") setStockItemOther("");
                    }}
                  />
                </div>
                {stockItem === "Others" ? (
                  <div className="field">
                    <label htmlFor="st-item-other">Other item</label>
                    <input
                      id="st-item-other"
                      required
                      placeholder="Enter item name"
                      value={stockItemOther}
                      onChange={(e) => setStockItemOther(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="prod-fields__row">
                  <div className="field">
                    <label htmlFor="st-qty">Quantity</label>
                    <DecimalInput
                      id="st-qty"
                      required
                      value={stockQty}
                      onChange={setStockQty}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="st-value">Value</label>
                    <DecimalInput
                      id="st-value"
                      required
                      value={stockValue}
                      onChange={setStockValue}
                    />
                  </div>
                </div>
                <div className="field expense-desc">
                  <label htmlFor="st-notes">Notes</label>
                  <textarea
                    id="st-notes"
                    value={stockNotes}
                    onChange={(e) => setStockNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <BillUpload
                  label="Upload stock images"
                  urls={stockPhotos}
                  onChange={setStockPhotos}
                />
              </>
            ) : null}

            {kind === "production" ? (
              <>
                <div className="prod-fields">
                  <div className="field">
                    <label htmlFor="prod-name">Product name</label>
                    <SelectMenu
                      id="prod-name"
                      value={productName}
                      options={PRODUCT_NAMES}
                      required
                      onChange={(next) => {
                        const match = PRODUCTS.find((p) => p.name === next);
                        setProductName(
                          (match?.name ?? next) as (typeof PRODUCT_NAMES)[number],
                        );
                        if (match) setProdUnit(match.unit);
                      }}
                    />
                  </div>
                  <div className="prod-fields__row">
                    <div className="field">
                      <label htmlFor="prod-unit">Unit</label>
                      <SelectMenu
                        id="prod-unit"
                        value={prodUnit}
                        options={PRODUCT_UNITS}
                        required
                        onChange={(next) =>
                          setProdUnit(next as (typeof PRODUCT_UNITS)[number])
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="prod-qty">Quantity</label>
                      <DecimalInput
                        id="prod-qty"
                        required
                        value={prodQty}
                        onChange={setProdQty}
                      />
                    </div>
                  </div>
                </div>
                <h3 className="today-card__title" style={{ marginTop: "0.35rem" }}>
                  Manpower
                </h3>
                <div className="manpower-grid">
                  <div className="field">
                    <label htmlFor="m-mgr">Manager</label>
                    <DecimalInput
                      id="m-mgr"
                      integer
                      value={mgr}
                      onChange={setMgr}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="m-ops">Operator</label>
                    <DecimalInput
                      id="m-ops"
                      integer
                      value={ops}
                      onChange={setOps}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="m-help">Helper</label>
                    <DecimalInput
                      id="m-help"
                      integer
                      value={helpers}
                      onChange={setHelpers}
                    />
                  </div>
                </div>
                <p className="cost-hint">
                  Est. manpower cost{" "}
                  <span className="cost-hint__amount">
                    {formatINR(manpowerCost)}
                  </span>{" "}
                  (rates from plant settings)
                </p>
              </>
            ) : null}

            {kind === "expense" ? (
              <>
                <div className="field">
                  <label htmlFor="e-head">Category</label>
                  <SelectMenu
                    id="e-head"
                    value={String(expenseHead)}
                    options={EXPENSE_HEADS}
                    required
                    onChange={(next) => setExpenseHead(next)}
                  />
                </div>
                <div className="prod-fields__row">
                  <div className="field">
                    <label htmlFor="e-amt">Amount</label>
                    <DecimalInput
                      id="e-amt"
                      required
                      value={expenseAmount}
                      onChange={setExpenseAmount}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="e-paid">Paid to</label>
                    <input
                      id="e-paid"
                      value={paidTo}
                      onChange={(e) => setPaidTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field expense-desc">
                  <label htmlFor="e-desc">Description</label>
                  <textarea
                    id="e-desc"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    rows={4}
                  />
                </div>
                <BillUpload urls={expensePhotos} onChange={setExpensePhotos} />
              </>
            ) : null}
          </form>
      </SlideOver>
    </div>
  );
}

function LineEditor({
  lines,
  onChange,
  defaultUnit,
  itemLabel = "Item",
  itemOptions,
  itemPlaceholder,
  unitOptions,
  resolveUnitForItem,
  showGst = false,
}: {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  defaultUnit: string;
  itemLabel?: string;
  itemOptions?: readonly string[];
  itemPlaceholder?: string;
  unitOptions?: readonly string[];
  resolveUnitForItem?: (item: string) => string | undefined;
  showGst?: boolean;
}) {
  return (
    <div className="line-stack">
      {lines.map((line, idx) => (
          <div key={line.id} className="line-stack__card">
            <div className="line-stack__row line-stack__row--item">
              <div className="field" style={{ margin: 0, flex: 1 }}>
                <label htmlFor={`line-item-${line.id}`}>{itemLabel}</label>
                {itemOptions ? (
                  <SelectMenu
                    id={`line-item-${line.id}`}
                    value={line.itemDescription}
                    options={itemOptions}
                    required={idx === 0}
                    placeholder={itemPlaceholder ?? `Select ${itemLabel.toLowerCase()}`}
                    onChange={(next) => {
                      const copy = [...lines];
                      const unit = next ? resolveUnitForItem?.(next) : undefined;
                      copy[idx] = {
                        ...line,
                        itemDescription: next,
                        ...(unit ? { unit } : {}),
                      };
                      onChange(copy);
                    }}
                  />
                ) : (
                  <input
                    id={`line-item-${line.id}`}
                    required={idx === 0}
                    value={line.itemDescription}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, itemDescription: e.target.value };
                      onChange(next);
                    }}
                    placeholder={itemLabel}
                  />
                )}
              </div>
              {lines.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-ghost line-stack__remove"
                  aria-label="Remove line"
                  onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
                >
                  ✕
                </button>
              ) : null}
            </div>

            <div className={`line-stack__row line-stack__row--meta${showGst ? " has-gst" : ""}${unitOptions ? " has-unit" : ""}`}>
              {unitOptions ? (
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-unit-${line.id}`}>Unit</label>
                  <SelectMenu
                    id={`line-unit-${line.id}`}
                    value={
                      unitOptions.some((u) => u === line.unit)
                        ? line.unit
                        : unitOptions[0] || line.unit
                    }
                    options={unitOptions}
                    required={idx === 0}
                    onChange={(unit) => {
                      const next = [...lines];
                      next[idx] = { ...line, unit };
                      onChange(next);
                    }}
                  />
                </div>
              ) : null}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`line-qty-${line.id}`}>Qty</label>
                <DecimalInput
                  id={`line-qty-${line.id}`}
                  required={idx === 0}
                  value={line.quantity}
                  onChange={(quantity) => {
                    const next = [...lines];
                    next[idx] = { ...line, quantity };
                    onChange(next);
                  }}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`line-rate-${line.id}`}>Rate</label>
                <DecimalInput
                  id={`line-rate-${line.id}`}
                  required={idx === 0}
                  value={line.rate}
                  onChange={(rate) => {
                    const next = [...lines];
                    next[idx] = { ...line, rate };
                    onChange(next);
                  }}
                />
              </div>
              {showGst ? (
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-gst-${line.id}`}>GST %</label>
                  <DecimalInput
                    id={`line-gst-${line.id}`}
                    value={line.gstPercent}
                    onChange={(gstPercent) => {
                      const next = [...lines];
                      next[idx] = { ...line, gstPercent };
                      onChange(next);
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...lines,
            newLine(
              resolveUnitForItem?.(itemOptions?.find((o) => o) ?? "") ??
                defaultUnit,
              "",
            ),
          ])
        }
        style={{ marginTop: "0.35rem" }}
      >
        + Add item
      </Button>
    </div>
  );
}
