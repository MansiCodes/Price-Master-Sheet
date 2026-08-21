"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { PRODUCT_UNITS, CAT6_LINE_UNITS } from "@/lib/units";
import {
  DEFAULT_PURCHASE_GOODS,
  PVC_FAR_DEP_PERCENT,
  PVC_FAR_VENDORS,
  PVC_UNLOADING_RATE_PER_MT,
  PVC_EXPENSE_SECTIONS,
  PVC_ATCL_VENDOR_NAME,
  PVC_ATCL_PURCHASE_NOTE_PREFIX,
  getExpenseHeads,
  getExpenseHeadsForSection,
  usesExpenseSections,
  type PvcExpenseSection,
  STOCK_CATEGORIES,
  getCat6PettyCatalog,
  getCustomerCatalog,
  getPurchaseCatalog,
  getSalesCatalog,
  getStockCatalog,
  pvcStockEntryNotes,
  type PvcStockEntryType,
} from "@/lib/plant-catalogs";
import { isCat6Plant, mapCat6PettyNature } from "@/lib/plant-layout";
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

const MODULE_KIND: Partial<Record<TodayModuleKey, EntryKind>> = {
  purchaseFilled: "purchase",
  saleFilled: "sale",
  stockFilled: "stock",
  pettyCashFilled: "expense",
};

const KIND_TO_MODULE: Partial<Record<EntryKind, TodayModuleKey>> = {
  purchase: "purchaseFilled",
  sale: "saleFilled",
  stock: "stockFilled",
  expense: "pettyCashFilled",
  // Petty cash does not mark the Expense circle — only Expense entries do.
};

type EntryKind =
  | "purchase"
  | "sale"
  | "stock"
  | "expense"
  | "contactList";

const ENTRY_KINDS: EntryKind[] = [
  "purchase",
  "sale",
  "stock",
  "expense",
  "contactList",
];

const ENTRY_KIND_LABEL_KEY: Record<EntryKind, string> = {
  purchase: "purchase",
  sale: "sales",
  stock: "stock",
  expense: "expense",
  contactList: "contactList",
};

type LineItem = {
  id: string;
  itemDescription: string;
  unit: string;
  quantity: string;
  rate: string;
  gstPercent: string;
  inMeter?: string;
  qtyMtr?: string;
  meterUnit?: string;
};

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

const PRODUCTS = [
  { name: "RDSO Black", unit: "KGS" },
  { name: "RDSO Grey", unit: "KGS" },
] as const;

const PRODUCT_NAMES = PRODUCTS.map((p) => p.name);

const STOCK_CATEGORIES_OPTIONS = [...STOCK_CATEGORIES] as const;

function newLine(unit = "Kg", itemDescription = ""): LineItem {
  return {
    id: crypto.randomUUID(),
    itemDescription,
    unit,
    quantity: "",
    rate: "",
    gstPercent: "18",
    inMeter: "",
    qtyMtr: "",
    meterUnit: "",
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
  /** Render only the entry slide-over (used by global header on non-dashboard pages). */
  overlayOnly?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
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
  overlayOnly = false,
  externalOpen,
  onExternalOpenChange,
}: TodayHubProps) {
  const router = useRouter();
  const t = useTranslations("today");
  const tCommon = useTranslations("common");
  const today = useMemo(() => todayLocalISO(), []);
  const purchaseCatalog = useMemo(
    () => getPurchaseCatalog(plantCode),
    [plantCode],
  );
  const stockCatalog = useMemo(
    () => getStockCatalog(plantCode),
    [plantCode],
  );
  const isPvc = plantCode.toUpperCase() === "PVC";
  const isCat6 = isCat6Plant(plantCode);
  const hasExpenseSections = usesExpenseSections(plantCode);
  const saleProducts = useMemo(() => getSalesCatalog(plantCode), [plantCode]);
  const customers = useMemo(() => getCustomerCatalog(plantCode), [plantCode]);
  const pettyCatalog = useMemo(() => getCat6PettyCatalog(), []);
  const [expenseSection, setExpenseSection] = useState<PvcExpenseSection>("direct");
  const [purchaseSource, setPurchaseSource] = useState<"vendor" | "atcl">("vendor");
  const expenseHeads = useMemo(
    () =>
      hasExpenseSections
        ? [...getExpenseHeadsForSection(plantCode, expenseSection)]
        : [...getExpenseHeads(plantCode)],
    [plantCode, hasExpenseSections, expenseSection],
  );
  const farVendorOptions = useMemo(() => [...PVC_FAR_VENDORS, "Other"], []);
  const cat6SupplierOptions = useMemo(
    () => [...purchaseCatalog.suppliers, "Other"],
    [purchaseCatalog.suppliers],
  );
  const cat6CustomerOptions = useMemo(
    () => [...customers, "Other"],
    [customers],
  );
  const stockParticulars = [...stockCatalog.particulars, "Others"];

  const entryOptions = useMemo(
    () =>
      ENTRY_KINDS.map(
        (value) => ({
          value,
          label: t(ENTRY_KIND_LABEL_KEY[value] as "purchase"),
        }),
      ),
    [t],
  );

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
  const [vendorName, setVendorName] = useState("");
  const [vendorNameOther, setVendorNameOther] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [purchaseGstin, setPurchaseGstin] = useState("");
  const [purchaseBooksDate, setPurchaseBooksDate] = useState("");
  const [purchaseRemarks, setPurchaseRemarks] = useState("");
  const [billPhotos, setBillPhotos] = useState<string[]>([]);
  const [purchaseLines, setPurchaseLines] = useState<LineItem[]>([
    newLine(isCat6Plant(plantCode) ? "NOS" : "KGS", ""),
  ]);

  // Sale
  const [customerName, setCustomerName] = useState("");
  const [customerNameOther, setCustomerNameOther] = useState("");
  const [saleType, setSaleType] = useState<SaleTypeValue>("FINISHED_GOOD");
  const [saleTypeOther, setSaleTypeOther] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleRemarks, setSaleRemarks] = useState("");
  const [invoicePhotos, setInvoicePhotos] = useState<string[]>([]);
  const [saleLines, setSaleLines] = useState<LineItem[]>([
    newLine(PRODUCTS[0].unit, PRODUCTS[0].name),
  ]);

  // Stock
  const [stockCategory, setStockCategory] =
    useState<(typeof STOCK_CATEGORIES)[number]>("RM");
  const [stockItem, setStockItem] = useState<string>(
    DEFAULT_PURCHASE_GOODS[0],
  );
  const [stockItemOther, setStockItemOther] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockUnit, setStockUnit] = useState("KGS");
  const [stockRate, setStockRate] = useState("");
  const [stockValue, setStockValue] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [stockType, setStockType] = useState<PvcStockEntryType>("closing");
  const [stockPhotos, setStockPhotos] = useState<string[]>([]);

  useEffect(() => {
    setStockItem(stockCatalog.particulars[0] ?? DEFAULT_PURCHASE_GOODS[0]);
    setStockUnit(stockCatalog.defaultUnit);
  }, [stockCatalog]);

  // Production
  const [shift, setShift] = useState<"DAY" | "NIGHT">("DAY");
  const [productName, setProductName] = useState<string>(PRODUCTS[0].name);
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
  const [expenseHead, setExpenseHead] = useState(() =>
    isCat6Plant(plantCode) ? "Miscellaneous" : "Fuel & Power",
  );
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseOpeningReading, setExpenseOpeningReading] = useState("");
  const [expenseClosingReading, setExpenseClosingReading] = useState("");
  const [expensePhotos, setExpensePhotos] = useState<string[]>([]);
  const [expenseMonth, setExpenseMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rentCoveredArea, setRentCoveredArea] = useState("");
  const [rentRatePerSqft, setRentRatePerSqft] = useState("12");
  const [farVendor, setFarVendor] = useState("");
  const [farVendorOther, setFarVendorOther] = useState("");
  const [farDescription, setFarDescription] = useState("");
  const [farBillNumber, setFarBillNumber] = useState("");
  const [farCost, setFarCost] = useState("");
  const [farDepPercent, setFarDepPercent] = useState(String(PVC_FAR_DEP_PERCENT));
  const [unloadQtyMt, setUnloadQtyMt] = useState("");
  const [unloadRatePerMt, setUnloadRatePerMt] = useState(
    String(PVC_UNLOADING_RATE_PER_MT),
  );
  const [pettyCashPayMode, setPettyCashPayMode] = useState("");
  const [pettyCashDescription, setPettyCashDescription] = useState("");
  const [pettyCashBillNumber, setPettyCashBillNumber] = useState("");
  const [pettyCashExpense, setPettyCashExpense] = useState("");
  const [pettyCashContractorSalary, setPettyCashContractorSalary] = useState("");
  const [pettyCashSupervisorSalary, setPettyCashSupervisorSalary] = useState("");
  const [pettyCashPhotos, setPettyCashPhotos] = useState<string[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactCategory, setContactCategory] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");
  const [pettyNature, setPettyNature] = useState("");
  const [pettyPerson, setPettyPerson] = useState("");
  const [pettyLocation, setPettyLocation] = useState("");
  const [pettyCheckedBy, setPettyCheckedBy] = useState("");
  const [pettyApprovedBy, setPettyApprovedBy] = useState("");

  const activeModules = checklist[reportShift].filter((m) => m.key !== "productionFilled");
  const activeCompleted = activeModules.filter((m) => m.filled).length;

  function setPanelOpen(next: boolean) {
    if (externalOpen != null) {
      onExternalOpenChange?.(next);
    } else {
      setOpen(next);
    }
  }

  function openAdd(nextKind: EntryKind = "purchase", nextShift: ShiftKey = reportShift) {
    setError(null);
    setKind(nextKind);
    setShift(nextShift);
    setEntryDate(readStoredEntryDate() || date || today);
    setPanelOpen(true);
  }

  const panelOpen = externalOpen ?? open;

  useEffect(() => {
    if (!canEnter || overlayOnly) return;

    function onOpenRequest() {
      openAdd();
    }

    window.addEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest);
    };
    // openAdd closes over latest date/today/canEnter via render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEnter, date, today, overlayOnly]);

  function resetAll() {
    setPurchaseType("RAW_MATERIAL");
    setPurchaseTypeOther("");
    setVendorName("");
    setVendorNameOther("");
    setBillNumber("");
    setPurchaseGstin("");
    setPurchaseBooksDate("");
    setPurchaseRemarks("");
    setBillPhotos([]);
    setPurchaseLines([newLine(isCat6 ? "NOS" : "KGS", "")]);
    setCustomerName(customers[0] ?? "");
    setCustomerNameOther("");
    setSaleType("FINISHED_GOOD");
    setSaleTypeOther("");
    setInvoiceNo("");
    setSaleRemarks("");
    setInvoicePhotos([]);
    setSaleLines([
      newLine(isCat6 ? "NOS" : PRODUCTS[0].unit, PRODUCTS[0].name),
    ]);
    setStockCategory("RM");
    setStockItem(stockCatalog.particulars[0] ?? DEFAULT_PURCHASE_GOODS[0]);
    setStockItemOther("");
    setStockQty("");
    setStockUnit(stockCatalog.defaultUnit);
    setStockRate("");
    setStockValue("");
    setStockNotes("");
    setStockType("closing");
    setStockPhotos([]);
    setShift("DAY");
    setProductName(saleProducts[0] ?? PRODUCTS[0].name);
    setProdQty("");
    setProdUnit(PRODUCTS[0].unit);
    setMgr("1");
    setOps("8");
    setHelpers("4");
    setExpenseSection(isCat6 ? "indirect" : "direct");
    setExpenseHead(isCat6 ? "Miscellaneous" : "Fuel & Power");
    setPurchaseSource("vendor");
    setExpenseAmount("");
    setPaidTo("");
    setExpenseDesc(isCat6 ? "Salary" : "");
    setExpenseOpeningReading("");
    setExpenseClosingReading("");
    setExpensePhotos([]);
    setExpenseMonth(entryDate.slice(0, 7) || today.slice(0, 7));
    setRentCoveredArea("");
    setRentRatePerSqft("12");
    setFarVendor("");
    setFarVendorOther("");
    setFarDescription("");
    setFarBillNumber("");
    setFarCost("");
    setFarDepPercent(String(PVC_FAR_DEP_PERCENT));
    setUnloadQtyMt("");
    setUnloadRatePerMt(String(PVC_UNLOADING_RATE_PER_MT));
    setPettyCashPayMode("");
    setPettyCashDescription("");
    setPettyCashBillNumber("");
    setPettyCashExpense("");
    setPettyCashContractorSalary("");
    setPettyCashSupervisorSalary("");
    setPettyCashPhotos([]);
    setPettyNature("");
    setPettyPerson("");
    setPettyLocation("");
    setPettyCheckedBy("");
    setPettyApprovedBy("");
    setContactName("");
    setContactPhone("");
    setContactCategory("");
    setContactDesignation("");
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
    setPanelOpen(false);
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

    let result: { ok: true; data: unknown } | { ok: false; error: string } | null =
      null;

    if (kind === "purchase") {
      const resolvedVendorName =
        vendorName === "Other" ? vendorNameOther.trim() : vendorName.trim();
      const items = purchaseLines
        .map((l) => ({
          itemDescription: l.itemDescription.trim(),
          unit: l.unit.trim() || "KGS",
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          gstPercent: isCat6 ? 0 : Number(l.gstPercent) || 0,
        }))
        .filter((l) => l.itemDescription && l.quantity > 0);
      if (
        (!isPvc || purchaseSource !== "atcl") &&
        (!resolvedVendorName || items.length === 0)
      ) {
        fail("Add supplier and at least one description item.");
        return;
      }
      if (isPvc && purchaseSource === "atcl" && items.length === 0) {
        fail("Add at least one inward stock line.");
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
        typeOther: purchaseType === "OTHERS" ? purchaseTypeOther.trim() : null,
        vendorName:
          isPvc && purchaseSource === "atcl"
            ? PVC_ATCL_VENDOR_NAME
            : resolvedVendorName,
        billNumber: billNumber || null,
        billDate: entryDate,
        gstin: isCat6 ? purchaseGstin.trim() || null : null,
        booksDate: isCat6 ? purchaseBooksDate || entryDate : null,
        notes:
          isPvc && purchaseSource === "atcl"
            ? [PVC_ATCL_PURCHASE_NOTE_PREFIX, purchaseRemarks.trim()]
                .filter(Boolean)
                .join(" · ") || PVC_ATCL_PURCHASE_NOTE_PREFIX
            : purchaseRemarks.trim() || null,
        billPhotoUrls: billPhotos,
        items,
      });
    } else if (kind === "sale") {
      const resolvedCustomerName =
        customerName === "Other"
          ? customerNameOther.trim()
          : customerName.trim();
      const items = saleLines
        .map((l) => ({
          itemDescription: l.itemDescription.trim(),
          unit: l.unit.trim() || "PCS",
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          ...(isCat6
            ? {
                inMeter: l.inMeter?.trim() ? Number(l.inMeter) : null,
                qtyMtr: l.qtyMtr?.trim() ? Number(l.qtyMtr) : null,
                meterUnit: l.meterUnit?.trim() || null,
              }
            : {}),
        }))
        .filter((l) => l.itemDescription && l.quantity > 0);
      if (!resolvedCustomerName || items.length === 0) {
        fail("Add customer and at least one product.");
        return;
      }
      if (!isCat6 && saleType === "OTHERS" && !saleTypeOther.trim()) {
        fail("Describe the sales type for Others.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/sales`, {
        date: entryDate,
        shift,
        type: isCat6 ? "FINISHED_GOOD" : saleType,
        typeOther: !isCat6 && saleType === "OTHERS" ? saleTypeOther.trim() : null,
        customerName: resolvedCustomerName,
        billNumber: invoiceNo || null,
        billDate: entryDate,
        notes: isCat6 ? null : saleRemarks.trim() || null,
        billPhotoUrls: invoicePhotos,
        items,
      });
    } else if (kind === "stock") {
      const resolvedItem =
        stockItem === "Others" ? stockItemOther.trim() : stockItem.trim();
      const closingQty = Number(stockQty);
      const closingRate = Number(stockRate);
      const closingValue =
        stockValue === ""
          ? closingQty * closingRate
          : Number(stockValue);
      if (
        !resolvedItem ||
        stockQty === "" ||
        (isPvc ? stockRate === "" : stockValue === "")
      ) {
        fail(
          stockItem === "Others" && !stockItemOther.trim()
            ? "Enter the other item name."
            : isPvc
              ? "Enter particulars, closing stock, unit, and rate."
              : "Enter item, quantity, and value.",
        );
        return;
      }
      if (
        !(closingQty >= 0) ||
        (isPvc ? !(closingRate >= 0) : !(closingValue >= 0))
      ) {
        fail("Quantity, rate, and value must be zero or more.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/stock`, {
        date: entryDate,
        shift,
        itemName: resolvedItem,
        category: stockCategory,
        unit: isPvc
          ? stockUnit || "KGS"
          : isCat6
            ? stockUnit || stockCatalog.defaultUnit || "NOS"
            : "kg",
        quantity: closingQty,
        rate: isPvc ? closingRate : undefined,
        value: isPvc ? closingQty * closingRate : closingValue,
        notes: isPvc
          ? pvcStockEntryNotes(stockType, entryDate, stockNotes)
          : stockNotes.trim() || `Closing stock as on ${entryDate}`,
        photoUrls: stockPhotos,
      });
    } else if (kind === "expense") {
      if (isPvc && expenseHead === "Factory Rent") {
        const area =
          rentCoveredArea === "" ? null : Number(rentCoveredArea);
        const rate = Number(rentRatePerSqft) || 12;
        const rentAmount =
          area != null && Number.isFinite(area)
            ? area * rate
            : Number(expenseAmount);
        if (!(rentAmount > 0)) {
          fail("Enter covered area × rate or a rent amount.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/electricity`, {
          month: expenseMonth || entryDate.slice(0, 7),
          coveredAreaSqft: area,
          rentRatePerSqft: rate,
          rentAmount,
          notes: expenseDesc.trim() || null,
        });
      } else if (
        isPvc &&
        (expenseHead === "FAR" || expenseHead === "Depreciation (FAR)")
      ) {
        const cost = Number(farCost);
        const vendor =
          farVendor === "Other"
            ? farVendorOther.trim()
            : farVendor.trim();
        if (!farDescription.trim() || !(cost > 0)) {
          fail("Enter asset description and actual cost.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/assets`, {
          assetDescription: farDescription.trim(),
          vendor: vendor || null,
          billNumber: farBillNumber.trim() || null,
          billDate: entryDate || null,
          cost,
          gst: 0,
          depreciationPercent: Number(farDepPercent) || PVC_FAR_DEP_PERCENT,
        });
      } else if (
        isPvc &&
        (expenseHead === "Unloading of MT" || expenseHead === "Unloading MT")
      ) {
        const qty = Number(unloadQtyMt);
        const rate =
          Number(unloadRatePerMt) > 0
            ? Number(unloadRatePerMt)
            : PVC_UNLOADING_RATE_PER_MT;
        const amount = qty * rate;
        if (!(qty > 0) || !(amount > 0)) {
          fail("Enter unloading quantity (MT) and rate.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          payMode: paidTo.trim() || "CASH",
          expenseHead: "Unloading of MT",
          description:
            [
              paidTo && `Paid to: ${paidTo}`,
              expenseDesc.trim() || `${qty} MT @ ₹${rate}/MT`,
            ]
              .filter(Boolean)
              .join(" · ") || null,
          openingReading: qty,
          closingReading: rate,
          amount,
          contractorSalary: 0,
          supervisorSalary: 0,
          billPhotoUrls: expensePhotos,
        });
      } else if (isPvc && expenseHead === "Labour Contractor") {
        const amount = Number(expenseAmount);
        if (!(amount > 0)) {
          fail("Enter labour contractor amount.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          entryType: "PETTY_CASH",
          payMode: paidTo.trim() || "CASH",
          expenseHead: "Labour Contractor",
          description: expenseDesc.trim() || "Labour contractor",
          amount,
          contractorSalary: amount,
          supervisorSalary: 0,
          billPhotoUrls: expensePhotos,
        });
      } else if (isPvc && expenseHead === "Salary Expenses") {
        const amount = Number(expenseAmount);
        if (!(amount > 0)) {
          fail("Enter salary amount.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          entryType: "PETTY_CASH",
          payMode: paidTo.trim() || "CASH",
          expenseHead: "Salary Expenses",
          description: expenseDesc.trim() || "Salary expenses",
          amount,
          contractorSalary: 0,
          supervisorSalary: amount,
          billPhotoUrls: expensePhotos,
        });
      } else if (expenseHead === "Petty Cash") {
        if (isCat6) {
          const amount = Number(pettyCashExpense) || 0;
          if (
            !pettyNature.trim() ||
            !pettyCashDescription.trim() ||
            !pettyPerson.trim() ||
            !(amount > 0)
          ) {
            fail("Enter nature, description, person, and output amount.");
            return;
          }
          result = await postJson(`/api/plants/${plantId}/petty-cash`, {
            date: entryDate,
            shift,
            entryType: "PETTY_CASH",
            payMode: pettyPerson.trim(),
            expenseHead: mapCat6PettyNature(pettyNature),
            nature: pettyNature.trim(),
            description: pettyCashDescription.trim(),
            location: pettyLocation.trim() || null,
            checkedBy: pettyCheckedBy.trim() || null,
            approvedBy: pettyApprovedBy.trim() || null,
            amount,
            contractorSalary: 0,
            supervisorSalary: 0,
            billPhotoUrls: pettyCashPhotos,
          });
        } else {
          const amount = Number(pettyCashExpense) || 0;
          const contractorSalary = Number(pettyCashContractorSalary) || 0;
          const supervisorSalary = Number(pettyCashSupervisorSalary) || 0;
          if (
            !pettyCashPayMode.trim() ||
            !pettyCashDescription.trim() ||
            amount + contractorSalary + supervisorSalary <= 0
          ) {
            fail(t("enterPettyCash"));
            return;
          }
          result = await postJson(`/api/plants/${plantId}/petty-cash`, {
            date: entryDate,
            shift,
            entryType: "PETTY_CASH",
            payMode: pettyCashPayMode.trim(),
            expenseHead: "Petty Cash",
            description: pettyCashDescription.trim(),
            billNumber: pettyCashBillNumber.trim() || null,
            amount,
            contractorSalary,
            supervisorSalary,
            billPhotoUrls: pettyCashPhotos,
          });
        }
      } else {
        const amount = Number(expenseAmount);
        if (!(amount > 0) || !expenseHead) {
          fail(t("enterCategoryAmount"));
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          payMode: isCat6 ? "CASH" : paidTo.trim() || "CASH",
          expenseHead: String(expenseHead),
          description:
            (isCat6
              ? expenseDesc.trim() ||
                (expenseHead === "Miscellaneous" ? "Salary" : "")
              : [paidTo && `Paid to: ${paidTo}`, expenseDesc]
                  .filter(Boolean)
                  .join(" · ")) || null,
          openingReading:
            (expenseHead === "Electricity" || expenseHead === "Fuel & Power") &&
            expenseOpeningReading
              ? Number(expenseOpeningReading)
              : null,
          closingReading:
            (expenseHead === "Electricity" || expenseHead === "Fuel & Power") &&
            expenseClosingReading
              ? Number(expenseClosingReading)
              : null,
          amount,
          contractorSalary: 0,
          supervisorSalary: 0,
          billPhotoUrls: expensePhotos,
        });
      }
    } else if (kind === "contactList") {
      if (!contactName.trim()) {
        fail("Enter contact name.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/contacts`, {
        name: contactName.trim(),
        phone: contactPhone.trim() || null,
        category: contactCategory.trim() || null,
        designation: contactDesignation.trim() || null,
      });
    } else {
      fail("Unknown entry type.");
      return;
    }

    setSaving(false);
    if (!result || !result.ok) {
      fail(result?.error || "Could not save entry.");
      return;
    }

    const labels: Record<EntryKind, string> = {
      purchase: t("purchaseSaved"),
      sale: t("salesSaved"),
      stock: t("stockSaved"),
      expense: t("expenseSaved"),
      contactList: "Contact saved",
    };
    toast.success(labels[kind]);
    closePanel();
    resetAll();
    if (kind !== "contactList" && entryDate === date) {
      const moduleKey = KIND_TO_MODULE[kind];
      if (moduleKey) markModuleFilled(moduleKey, shift);
    }
    void syncChecklistFromServer();
    router.refresh();
  }

  return (
    <div
      className={`today-hub ${embedded ? "today-hub--embedded" : ""}${
        overlayOnly ? " today-hub--overlay-only" : ""
      }`}
    >
      {!embedded && !overlayOnly ? (
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

      {!overlayOnly ? (
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
      ) : null}

      <SlideOver
        open={panelOpen}
        onClose={closePanel}
        title={t("title")}
        footer={
          <>
            <Button variant="secondary" onClick={closePanel}>
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              form="today-entry-form"
              disabled={saving}
            >
              {saving ? tCommon("saving") : tCommon("save")}
            </Button>
          </>
        }
      >
        {error ? <Alert type="error">{error}</Alert> : null}

        <form id="today-entry-form" className="form-grid" onSubmit={onSubmit}>
            <div className={`form-grid ${isCat6 ? "two" : "three"}`}>
              <div className="field">
                <label htmlFor="entry-kind">{t("entryType")}</label>
                <SelectMenu
                  id="entry-kind"
                  value={
                    entryOptions.find((o) => o.value === kind)?.label ??
                    t("purchase")
                  }
                  options={entryOptions.map((o) => o.label)}
                  required
                  onChange={(label) => {
                    const next = entryOptions.find((o) => o.label === label);
                    if (next) setKind(next.value);
                  }}
                />
              </div>
              {kind !== "contactList" && (
              <div className="field">
                <label htmlFor="entry-date">
                  {isCat6
                    ? kind === "expense"
                      ? "Date"
                      : "Bill Date"
                    : kind === "expense" && expenseHead === "Petty Cash"
                      ? t("billDate")
                      : t("date")}
                </label>
                <input
                  id="entry-date"
                  type="date"
                  required
                  max={todayLocalISO()}
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              )}
              {kind !== "contactList" && !isCat6 && (
              <div className="field">
                <label>{t("shift")}</label>
                <div className="shift-toggle">
                  <button
                    type="button"
                    className={shift === "DAY" ? "is-active" : ""}
                    onClick={() => setShift("DAY")}
                  >
                    {tCommon("day")}
                  </button>
                  <button
                    type="button"
                    className={shift === "NIGHT" ? "is-active" : ""}
                    onClick={() => setShift("NIGHT")}
                  >
                    {tCommon("night")}
                  </button>
                </div>
              </div>
              )}
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
                {isPvc ? (
                  <div className="field">
                    <label htmlFor="p-source">Purchase source</label>
                    <SelectMenu
                      id="p-source"
                      value={
                        purchaseSource === "atcl"
                          ? "Stock from ATCL"
                          : "Vendor purchase"
                      }
                      options={["Vendor purchase", "Stock from ATCL"]}
                      required
                      onChange={(label) =>
                        setPurchaseSource(
                          label === "Stock from ATCL" ? "atcl" : "vendor",
                        )
                      }
                    />
                  </div>
                ) : null}
                {isCat6 ? (
                <div className="field">
                  <label htmlFor="p-gstin">GSTIN/GST No</label>
                  <input
                    id="p-gstin"
                    value={purchaseGstin}
                    onChange={(e) => setPurchaseGstin(e.target.value)}
                  />
                </div>
                ) : null}
                {isPvc && purchaseSource === "atcl" ? null : (
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="p-vendor">
                      {isCat6 ? "Vendor's Name" : "Supplier name"}
                    </label>
                    <SelectMenu
                      id="p-vendor"
                      value={vendorName}
                      options={isCat6 ? cat6SupplierOptions : purchaseCatalog.suppliers}
                      required={!(isPvc && purchaseSource === "atcl")}
                      placeholder="Select supplier"
                      onChange={(next) => {
                        setVendorName(next);
                        if (next !== "Other") setVendorNameOther("");
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="p-bill">{isCat6 ? "Bill Number" : "Invoice no. / Challan no."}</label>
                    <input
                      id="p-bill"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                    />
                  </div>
                </div>
                )}
                {isPvc && purchaseSource === "atcl" ? (
                  <div className="field">
                    <label htmlFor="p-bill-atcl">Challan no.</label>
                    <input
                      id="p-bill-atcl"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                    />
                  </div>
                ) : null}
                {isCat6 && vendorName === "Other" ? (
                  <div className="field">
                    <label htmlFor="p-vendor-other">Vendor&apos;s Name</label>
                    <input
                      id="p-vendor-other"
                      required
                      placeholder="Enter vendor name"
                      value={vendorNameOther}
                      onChange={(e) => setVendorNameOther(e.target.value)}
                    />
                  </div>
                ) : null}
                <LineEditor
                  lines={purchaseLines}
                  onChange={setPurchaseLines}
                  defaultUnit={isCat6 ? "NOS" : "KGS"}
                  itemLabel={
                    isPvc && purchaseSource === "atcl"
                      ? "Items Details"
                      : isCat6
                        ? "Item Details"
                        : "Description"
                  }
                  itemOptions={["", ...purchaseCatalog.goods]}
                  itemPlaceholder={
                    isCat6 ? "Select item details" : "Select description"
                  }
                  unitOptions={isCat6 ? CAT6_LINE_UNITS : PRODUCT_UNITS}
                  showGst={!isCat6 && !(isPvc && purchaseSource === "atcl")}
                />
                <div className="field">
                  <label htmlFor="p-remarks">{isCat6 ? "Notes" : "Remarks"}</label>
                  <input
                    id="p-remarks"
                    value={purchaseRemarks}
                    onChange={(e) => setPurchaseRemarks(e.target.value)}
                    placeholder={isCat6 ? "Optional notes" : "Optional remarks"}
                  />
                </div>
                <BillUpload urls={billPhotos} onChange={setBillPhotos} />
              </>
            ) : null}

            {kind === "sale" ? (
              <>
                {isCat6 ? (
                <div className="field">
                  <label htmlFor="s-cust">Customer Name</label>
                  <SelectMenu
                    id="s-cust"
                    value={customerName}
                    options={cat6CustomerOptions}
                    required
                    onChange={(next) => {
                      setCustomerName(next);
                      if (next !== "Other") setCustomerNameOther("");
                    }}
                  />
                </div>
                ) : (
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
                      options={customers}
                      required
                      onChange={(next) => setCustomerName(next)}
                    />
                  </div>
                </div>
                )}
                {isCat6 && customerName === "Other" ? (
                  <div className="field">
                    <label htmlFor="s-cust-other">Customer Name</label>
                    <input
                      id="s-cust-other"
                      required
                      placeholder="Enter customer name"
                      value={customerNameOther}
                      onChange={(e) => setCustomerNameOther(e.target.value)}
                    />
                  </div>
                ) : null}
                {!isCat6 && saleType === "OTHERS" ? (
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
                  <label htmlFor="s-inv">{isCat6 ? "Bill Number" : "Invoice no."}</label>
                  <input
                    id="s-inv"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>
                <LineEditor
                  lines={saleLines}
                  onChange={setSaleLines}
                  defaultUnit={isCat6 ? "NOS" : PRODUCTS[0].unit}
                  itemLabel="Item Details"
                  itemOptions={saleProducts}
                  unitOptions={isCat6 ? CAT6_LINE_UNITS : PRODUCT_UNITS}
                  showCat6MeterFields={isCat6}
                  resolveUnitForItem={(name) =>
                    PRODUCTS.find((p) => p.name === name)?.unit
                  }
                />
                {isCat6 ? null : (
                <div className="field">
                  <label htmlFor="s-remarks">Remarks</label>
                  <input
                    id="s-remarks"
                    value={saleRemarks}
                    onChange={(e) => setSaleRemarks(e.target.value)}
                    placeholder="e.g. Factory staff / Operator"
                  />
                </div>
                )}
                <BillUpload
                  label="Upload invoice"
                  urls={invoicePhotos}
                  onChange={setInvoicePhotos}
                />
              </>
            ) : null}

            {kind === "stock" ? (
              <>
                {isPvc ? (
                  <p className="cost-hint">
                    Closing stock snapshot — feeds P&L Opening / Closing Stock. Use
                    Purchase → Stock from ATCL for inward register.
                  </p>
                ) : null}
                {isPvc ? (
                  <div className="field">
                    <label htmlFor="st-category">Stock</label>
                    <SelectMenu
                      id="st-category"
                      value={stockCategory}
                      options={STOCK_CATEGORIES_OPTIONS}
                      required
                      onChange={(next) =>
                        setStockCategory(next as (typeof STOCK_CATEGORIES)[number])
                      }
                    />
                  </div>
                ) : null}
                <div className="field">
                  <label htmlFor="st-item">
                    {isPvc ? "Particulars" : "Item"}
                  </label>
                  <SelectMenu
                    id="st-item"
                    value={stockItem || stockParticulars[0]}
                    options={stockParticulars}
                    required
                    onChange={(next) => {
                      setStockItem(next);
                      if (next !== "Others") setStockItemOther("");
                    }}
                  />
                </div>
                {stockItem === "Others" ? (
                  <div className="field">
                    <label htmlFor="st-item-other">
                      {isPvc ? "Other particulars" : "Other item"}
                    </label>
                    <input
                      id="st-item-other"
                      required
                      placeholder={
                        isPvc ? "Enter particulars" : "Enter item name"
                      }
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
                      onChange={(next) => {
                        setStockQty(next);
                        const qty = Number(next);
                        const rate = Number(stockRate);
                        if (isPvc && Number.isFinite(qty) && Number.isFinite(rate)) {
                          setStockValue((qty * rate).toFixed(2));
                        }
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="st-unit">Unit</label>
                    {isPvc || isCat6 ? (
                      <SelectMenu
                        id="st-unit"
                        value={
                          stockCatalog.units.includes(stockUnit)
                            ? stockUnit
                            : stockCatalog.defaultUnit
                        }
                        options={stockCatalog.units}
                        required
                        onChange={setStockUnit}
                      />
                    ) : (
                      <input id="st-unit" value="kg" readOnly />
                    )}
                  </div>
                </div>
                {isPvc ? (
                  <div className="prod-fields__row">
                    <div className="field">
                      <label htmlFor="st-rate">Rate</label>
                      <DecimalInput
                        id="st-rate"
                        required
                        value={stockRate}
                        onChange={(next) => {
                          setStockRate(next);
                          const qty = Number(stockQty);
                          const rate = Number(next);
                          if (Number.isFinite(qty) && Number.isFinite(rate)) {
                            setStockValue((qty * rate).toFixed(2));
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="prod-fields__row">
                    <div className="field">
                      <label htmlFor="st-value">Rate</label>
                      <DecimalInput
                        id="st-value"
                        required
                        value={stockValue}
                        onChange={setStockValue}
                      />
                    </div>
                  </div>
                )}
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

            {kind === "expense" ? (
              <>
                {hasExpenseSections ? (
                  <div className="field">
                    <label htmlFor="e-section">Expense section</label>
                    <SelectMenu
                      id="e-section"
                      value={
                        PVC_EXPENSE_SECTIONS.find((s) => s.value === expenseSection)
                          ?.label ?? "Direct Expense"
                      }
                      options={PVC_EXPENSE_SECTIONS.map((s) => s.label)}
                      required
                      onChange={(label) => {
                        const next = PVC_EXPENSE_SECTIONS.find(
                          (s) => s.label === label,
                        );
                        if (!next) return;
                        setExpenseSection(next.value);
                        const heads = [
                          ...getExpenseHeadsForSection(plantCode, next.value),
                        ];
                        setExpenseHead(heads[0] ?? "");
                      }}
                    />
                  </div>
                ) : null}
                <div className="field">
                  <label htmlFor="e-head">{t("category")}</label>
                  <SelectMenu
                    id="e-head"
                    value={String(expenseHead)}
                    options={expenseHeads.length > 0 ? expenseHeads : ["—"]}
                    required={expenseHeads.length > 0}
                    disabled={expenseHeads.length === 0}
                    onChange={(next) => {
                      if (expenseHeads.length === 0) return;
                      setExpenseHead(next);
                      if (next !== "Electricity" && next !== "Fuel & Power") {
                        setExpenseOpeningReading("");
                        setExpenseClosingReading("");
                      }
                      if (
                        next === "Unloading of MT" ||
                        next === "Unloading MT"
                      ) {
                        if (!unloadRatePerMt) {
                          setUnloadRatePerMt(String(PVC_UNLOADING_RATE_PER_MT));
                        }
                      } else {
                        setUnloadQtyMt("");
                        setUnloadRatePerMt(String(PVC_UNLOADING_RATE_PER_MT));
                      }
                      if (isCat6 && next === "Miscellaneous" && !expenseDesc.trim()) {
                        setExpenseDesc("Salary");
                      }
                    }}
                  />
                  {isCat6 && expenseSection === "indirect" && expenseHeads.length === 0 ? (
                    <p className="field-hint">
                      No indirect categories. Use Direct for Petty Cash, or add Salary & Wages / Miscellaneous under Indirect.
                    </p>
                  ) : null}
                </div>
                {isPvc && expenseHead === "Factory Rent" ? (
                  <>
                    <div className="field">
                      <label htmlFor="e-month">Month</label>
                      <input
                        id="e-month"
                        type="month"
                        required
                        value={expenseMonth}
                        onChange={(e) => setExpenseMonth(e.target.value)}
                      />
                    </div>
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="e-rent-area">Covered Area (sqft)</label>
                        <DecimalInput
                          id="e-rent-area"
                          value={rentCoveredArea}
                          onChange={setRentCoveredArea}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="e-rent-rate">Rate (₹/sqft)</label>
                        <DecimalInput
                          id="e-rent-rate"
                          value={rentRatePerSqft}
                          onChange={setRentRatePerSqft}
                        />
                      </div>
                    </div>
                    <p className="cost-hint">
                      Rent amount{" "}
                      <span className="cost-hint__amount">
                        {formatINR(
                          Number(rentCoveredArea) > 0
                            ? Number(rentCoveredArea) *
                                (Number(rentRatePerSqft) || 12)
                            : Number(expenseAmount) || 0,
                        )}
                      </span>
                    </p>
                    <div className="field expense-desc">
                      <label htmlFor="e-desc">{t("remarksNotes")}</label>
                      <textarea
                        id="e-desc"
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                ) : isPvc &&
                  (expenseHead === "FAR" || expenseHead === "Depreciation (FAR)") ? (
                  <>
                    <div className="field">
                      <label htmlFor="far-vendor">Supplier Name</label>
                      <SelectMenu
                        id="far-vendor"
                        value={farVendor}
                        options={farVendorOptions}
                        required
                        onChange={setFarVendor}
                      />
                    </div>
                    {farVendor === "Other" ? (
                      <div className="field">
                        <label htmlFor="far-vendor-other">Supplier (other)</label>
                        <input
                          id="far-vendor-other"
                          value={farVendorOther}
                          onChange={(e) => setFarVendorOther(e.target.value)}
                          required
                        />
                      </div>
                    ) : null}
                    <div className="field">
                      <label htmlFor="far-desc">Assets Description</label>
                      <input
                        id="far-desc"
                        required
                        value={farDescription}
                        onChange={(e) => setFarDescription(e.target.value)}
                      />
                    </div>
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="far-bill">Bill Number</label>
                        <input
                          id="far-bill"
                          value={farBillNumber}
                          onChange={(e) => setFarBillNumber(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="far-cost">Actual Cost (₹)</label>
                        <DecimalInput
                          id="far-cost"
                          required
                          value={farCost}
                          onChange={setFarCost}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="far-dep">Depreciation %</label>
                      <DecimalInput
                        id="far-dep"
                        value={farDepPercent}
                        onChange={setFarDepPercent}
                      />
                    </div>
                  </>
                ) : isPvc &&
                  (expenseHead === "Unloading of MT" ||
                    expenseHead === "Unloading MT") ? (
                  <>
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="e-unload-qty">Quantity (MT)</label>
                        <DecimalInput
                          id="e-unload-qty"
                          required
                          value={unloadQtyMt}
                          onChange={setUnloadQtyMt}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="e-unload-rate">Rate (₹/MT)</label>
                        <DecimalInput
                          id="e-unload-rate"
                          required
                          value={unloadRatePerMt}
                          onChange={setUnloadRatePerMt}
                        />
                      </div>
                    </div>
                    <p className="cost-hint">
                      Unloading amount{" "}
                      <span className="cost-hint__amount">
                        {formatINR(
                          (Number(unloadQtyMt) || 0) *
                            (Number(unloadRatePerMt) > 0
                              ? Number(unloadRatePerMt)
                              : PVC_UNLOADING_RATE_PER_MT),
                        )}
                      </span>
                    </p>
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="e-paid">{t("paidTo")}</label>
                        <input
                          id="e-paid"
                          value={paidTo}
                          onChange={(e) => setPaidTo(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field expense-desc">
                      <label htmlFor="e-desc">{t("remarksNotes")}</label>
                      <textarea
                        id="e-desc"
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <BillUpload urls={expensePhotos} onChange={setExpensePhotos} />
                  </>
                ) : expenseHead === "Petty Cash" ? (
                  isCat6 ? (
                    <>
                      <div className="field">
                        <label htmlFor="pc-amount">Output Amt</label>
                        <DecimalInput
                          id="pc-amount"
                          required
                          value={pettyCashExpense}
                          onChange={setPettyCashExpense}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="pc-nature">Nature of Expense</label>
                        <SelectMenu
                          id="pc-nature"
                          value={pettyNature}
                          options={pettyCatalog.natures}
                          required
                          placeholder="Select nature"
                          onChange={setPettyNature}
                        />
                      </div>
                      <div className="field expense-desc">
                        <label htmlFor="pc-description">Expense Description</label>
                        <textarea
                          id="pc-description"
                          required
                          value={pettyCashDescription}
                          onChange={(e) => setPettyCashDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div className="form-grid two">
                        <div className="field">
                          <label htmlFor="pc-person">Person</label>
                          <SelectMenu
                            id="pc-person"
                            value={pettyPerson}
                            options={pettyCatalog.persons}
                            required
                            placeholder="Select person"
                            onChange={setPettyPerson}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="pc-location">Location</label>
                          <SelectMenu
                            id="pc-location"
                            value={pettyLocation}
                            options={pettyCatalog.locations}
                            placeholder="Select location"
                            onChange={setPettyLocation}
                          />
                        </div>
                      </div>
                      <div className="form-grid two">
                        <div className="field">
                          <label htmlFor="pc-checked">Check by</label>
                          <SelectMenu
                            id="pc-checked"
                            value={pettyCheckedBy}
                            options={pettyCatalog.checkedBy}
                            placeholder="Select checker"
                            onChange={setPettyCheckedBy}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="pc-approved">Approved By</label>
                          <SelectMenu
                            id="pc-approved"
                            value={pettyApprovedBy}
                            options={pettyCatalog.approvedBy}
                            placeholder="Select approver"
                            onChange={setPettyApprovedBy}
                          />
                        </div>
                      </div>
                      <BillUpload
                        label={t("uploadBill")}
                        urls={pettyCashPhotos}
                        onChange={setPettyCashPhotos}
                      />
                    </>
                  ) : (
                    <>
                      <div className="field">
                        <label htmlFor="pc-pay-mode">{t("payMode")}</label>
                        <input
                          id="pc-pay-mode"
                          required
                          placeholder="e.g. ADV-Cash or ADV-Bank"
                          value={pettyCashPayMode}
                          onChange={(e) => setPettyCashPayMode(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="pc-bill-number">{t("billNumber")}</label>
                        <input
                          id="pc-bill-number"
                          value={pettyCashBillNumber}
                          onChange={(e) => setPettyCashBillNumber(e.target.value)}
                        />
                      </div>
                      <div className="field expense-desc">
                        <label htmlFor="pc-description">
                          {t("descriptionOfExpense")}
                        </label>
                        <textarea
                          id="pc-description"
                          required
                          value={pettyCashDescription}
                          onChange={(e) => setPettyCashDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div className="prod-fields__row">
                        <div className="field">
                          <label htmlFor="pc-expense">{t("expenses")}</label>
                          <DecimalInput
                            id="pc-expense"
                            value={pettyCashExpense}
                            onChange={setPettyCashExpense}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="pc-contractor">{t("contractorSalary")}</label>
                          <DecimalInput
                            id="pc-contractor"
                            value={pettyCashContractorSalary}
                            onChange={setPettyCashContractorSalary}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor="pc-supervisor">{t("supervisorSalary")}</label>
                        <DecimalInput
                          id="pc-supervisor"
                          value={pettyCashSupervisorSalary}
                          onChange={setPettyCashSupervisorSalary}
                        />
                      </div>
                      <BillUpload
                        label={t("uploadBill")}
                        urls={pettyCashPhotos}
                        onChange={setPettyCashPhotos}
                      />
                    </>
                  )
                ) : (
                  <>
                {expenseHead === "Electricity" ||
                expenseHead === "Fuel & Power" ? (
                  <div className="prod-fields__row">
                    <div className="field">
                      <label htmlFor="e-opening">{t("openingReading")}</label>
                      <DecimalInput
                        id="e-opening"
                        value={expenseOpeningReading}
                        onChange={setExpenseOpeningReading}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="e-closing">{t("closingReading")}</label>
                      <DecimalInput
                        id="e-closing"
                        value={expenseClosingReading}
                        onChange={setExpenseClosingReading}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="prod-fields__row">
                  <div className="field">
                    <label htmlFor="e-amt">{isCat6 ? "Salary Amt" : t("amount")}</label>
                    <DecimalInput
                      id="e-amt"
                      required
                      value={expenseAmount}
                      onChange={setExpenseAmount}
                    />
                  </div>
                  {isCat6 ? null : (
                  <div className="field">
                    <label htmlFor="e-paid">{t("paidTo")}</label>
                    <input
                      id="e-paid"
                      value={paidTo}
                      onChange={(e) => setPaidTo(e.target.value)}
                    />
                  </div>
                  )}
                </div>
                <div className="field expense-desc">
                  <label htmlFor="e-desc">{isCat6 ? "Remarks" : t("remarksNotes")}</label>
                  <textarea
                    id="e-desc"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    rows={4}
                  />
                </div>
                <BillUpload urls={expensePhotos} onChange={setExpensePhotos} />
                  </>
                )}
              </>
            ) : null}

            {kind === "contactList" ? (
              <>
                <div className="field">
                  <label htmlFor="ct-name">Name</label>
                  <input id="ct-name" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
                </div>
                <div className="field">
                  <label htmlFor="ct-phone">Phone</label>
                  <input id="ct-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number" />
                </div>
                <div className="field">
                  <label htmlFor="ct-category">Category</label>
                  <input id="ct-category" value={contactCategory} onChange={(e) => setContactCategory(e.target.value)} placeholder="e.g. Pani Pipe" />
                </div>
                <div className="field">
                  <label htmlFor="ct-designation">Designation</label>
                  <input id="ct-designation" value={contactDesignation} onChange={(e) => setContactDesignation(e.target.value)} placeholder="e.g. Supplier" />
                </div>
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
  showCat6MeterFields = false,
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
  showCat6MeterFields?: boolean;
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
            {showCat6MeterFields ? (
              <div className="line-stack__row line-stack__row--meta line-stack__row--meter">
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-in-meter-${line.id}`}>In Meter</label>
                  <DecimalInput
                    id={`line-in-meter-${line.id}`}
                    value={line.inMeter ?? ""}
                    onChange={(inMeter) => {
                      const next = [...lines];
                      next[idx] = { ...line, inMeter };
                      onChange(next);
                    }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-qty-mtr-${line.id}`}>QTY-MTR</label>
                  <DecimalInput
                    id={`line-qty-mtr-${line.id}`}
                    value={line.qtyMtr ?? ""}
                    onChange={(qtyMtr) => {
                      const next = [...lines];
                      next[idx] = { ...line, qtyMtr };
                      onChange(next);
                    }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-meter-unit-${line.id}`}>Unit (MTR)</label>
                  <SelectMenu
                    id={`line-meter-unit-${line.id}`}
                    value={line.meterUnit?.trim() || "MTR"}
                    options={["MTR", "FT", "—"]}
                    onChange={(meterUnit) => {
                      const next = [...lines];
                      next[idx] = {
                        ...line,
                        meterUnit: meterUnit === "—" ? "" : meterUnit,
                      };
                      onChange(next);
                    }}
                  />
                </div>
              </div>
            ) : null}
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
