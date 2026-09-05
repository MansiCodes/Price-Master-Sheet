"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatINR } from "@/lib/format/inr";
import { postJson, todayLocalISO } from "@/lib/client-forms";
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
  UPCAST_MISC_NATURES,
  getExpenseHeads,
  getExpenseHeadsForSection,
  usesExpenseSections,
  type PvcExpenseSection,
  STOCK_CATEGORIES,
  getCat6PettyCatalog,
  getCustomerCatalog,
  getPurchaseCatalog,
  getQuadVendorsForMaterial,
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
  openingReading?: string;
  closingReading?: string;
  debitQuantity?: string;
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
    openingReading: "",
    closingReading: "",
    debitQuantity: "",
  };
}

async function fetchStockPurchaseRate(
  plantId: string,
  itemName: string,
  date: string,
): Promise<number | null> {
  const qs = new URLSearchParams({ itemName, date });
  const res = await fetch(`/api/plants/${plantId}/stock/average-rate?${qs}`);
  const json = (await res.json()) as { rate?: number | null };
  if (!res.ok) return null;
  return json.rate != null && Number.isFinite(json.rate) ? json.rate : null;
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
  /** Used to limit entry kinds (e.g. accountants → purchase + sales only). */
  userRole?: string;
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
  userRole = "",
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
  const isUpcast = plantCode.toUpperCase() === "UPCAST";
  const isQuad = plantCode.toUpperCase() === "QUAD";
  const isPvcStyleExpense = isPvc || isUpcast;
  /** Closing stock with RM/WIP/FG + rate × value (Excel ERS / PVC style). */
  const usesStockLedger = isPvc || isUpcast;
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
  const [customSuppliers, setCustomSuppliers] = useState<string[]>([]);
  const [customCustomers, setCustomCustomers] = useState<string[]>([]);
  const [customStockItems, setCustomStockItems] = useState<string[]>([]);
  const [customFarVendors, setCustomFarVendors] = useState<string[]>([]);

  const farVendorOptions = useMemo(
    () => {
      const base = (PVC_FAR_VENDORS as readonly string[]).filter((x) => x !== "Other" && x !== "Others");
      const custom = customFarVendors.filter((x) => x !== "Other" && x !== "Others");
      return Array.from(new Set([...base, ...custom, "Other"]));
    },
    [customFarVendors],
  );
  const cat6SupplierOptions = useMemo(
    () => {
      const base = purchaseCatalog.suppliers.filter((x) => x !== "Other" && x !== "Others");
      const custom = customSuppliers.filter((x) => x !== "Other" && x !== "Others");
      return Array.from(new Set([...base, ...custom, "Other"]));
    },
    [purchaseCatalog.suppliers, customSuppliers],
  );
  const cat6CustomerOptions = useMemo(
    () => {
      const base = customers.filter((x) => x !== "Other" && x !== "Others");
      const custom = customCustomers.filter((x) => x !== "Other" && x !== "Others");
      return Array.from(new Set([...base, ...custom, "Other"]));
    },
    [customers, customCustomers],
  );
  const stockParticulars = useMemo(
    () => {
      const base = stockCatalog.particulars
        .map((x) => (x === "Others" ? "Other" : x))
        .filter((x) => x !== "Other" && x !== "Others");
      const custom = customStockItems.filter((x) => x !== "Other" && x !== "Others");
      return Array.from(new Set([...base, ...custom, "Other"]));
    },
    [stockCatalog.particulars, customStockItems],
  );

  const accountantOnly =
    userRole === "ACCOUNTANT";
  const allowedEntryKinds = useMemo(
    () =>
      accountantOnly
        ? (["purchase", "sale"] as EntryKind[])
        : ENTRY_KINDS,
    [accountantOnly],
  );
  const allowedModuleKeys = useMemo(
    () =>
      new Set(
        accountantOnly
          ? (["purchaseFilled", "saleFilled"] as TodayModuleKey[])
          : ([
              "purchaseFilled",
              "saleFilled",
              "stockFilled",
              "pettyCashFilled",
            ] as TodayModuleKey[]),
      ),
    [accountantOnly],
  );

  const entryOptions = useMemo(
    () =>
      allowedEntryKinds.map((value) => ({
        value,
        label: t(ENTRY_KIND_LABEL_KEY[value] as "purchase"),
      })),
    [t, allowedEntryKinds],
  );

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EntryKind>("purchase");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(shiftModules);
  const [reportShift, setReportShift] = useState<ShiftKey>("DAY");

  useEffect(() => {
    if (!allowedEntryKinds.includes(kind)) {
      setKind(allowedEntryKinds[0] ?? "purchase");
    }
  }, [allowedEntryKinds, kind]);

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
  const quadSelectedMaterial = useMemo(() => {
    const desc = purchaseLines[0]?.itemDescription?.trim() ?? "";
    if (!desc || desc === "Other" || desc === "Others") return "";
    return desc;
  }, [purchaseLines]);
  const quadSupplierOptions = useMemo(() => {
    if (!quadSelectedMaterial) return [];
    const base = getQuadVendorsForMaterial(quadSelectedMaterial).filter(
      (x) => x !== "Other" && x !== "Others",
    );
    const custom = customSuppliers.filter((x) => x !== "Other" && x !== "Others");
    return Array.from(new Set([...base, ...custom, "Other"]));
  }, [quadSelectedMaterial, customSuppliers]);
  const purchaseSupplierOptions = isQuad
    ? quadSupplierOptions
    : cat6SupplierOptions;

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
  const [stockPurchaseRate, setStockPurchaseRate] = useState<number | null>(null);
  const [stockPurchaseRateLoading, setStockPurchaseRateLoading] = useState(false);
  const [stockNotes, setStockNotes] = useState("");
  const [stockType, setStockType] = useState<PvcStockEntryType>("closing");
  const [stockPhotos, setStockPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!isQuad) return;
    if (!quadSelectedMaterial) {
      if (vendorName) {
        setVendorName("");
        setVendorNameOther("");
      }
      return;
    }
    if (
      vendorName &&
      vendorName !== "Other" &&
      !quadSupplierOptions.includes(vendorName)
    ) {
      setVendorName("");
      setVendorNameOther("");
    }
  }, [isQuad, quadSelectedMaterial, quadSupplierOptions, vendorName]);

  useEffect(() => {
    setStockItem(stockCatalog.particulars[0] ?? DEFAULT_PURCHASE_GOODS[0]);
    setStockUnit(stockCatalog.defaultUnit);
  }, [stockCatalog]);

  const resolvedStockItemName = useMemo(() => {
    return stockItem === "Others" || stockItem === "Other"
      ? stockItemOther.trim()
      : stockItem.trim();
  }, [stockItem, stockItemOther]);

  useEffect(() => {
    if (kind !== "stock") {
      setStockPurchaseRate(null);
      setStockPurchaseRateLoading(false);
      return;
    }
    if (!resolvedStockItemName || !entryDate) {
      setStockPurchaseRate(null);
      return;
    }
    let cancelled = false;
    setStockPurchaseRateLoading(true);
    void (async () => {
      try {
        const rate = await fetchStockPurchaseRate(
          plantId,
          resolvedStockItemName,
          entryDate,
        );
        if (cancelled) return;
        setStockPurchaseRate(rate);
        if (rate != null) {
          setStockRate(String(rate));
        }
      } catch {
        if (!cancelled) setStockPurchaseRate(null);
      } finally {
        if (!cancelled) setStockPurchaseRateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, resolvedStockItemName, entryDate, plantId]);

  useEffect(() => {
    if (stockPurchaseRate == null || stockQty === "") {
      return;
    }
    const qty = Number(stockQty);
    if (!Number.isFinite(qty)) return;
    const manualRate = Number(stockRate);
    if (!Number.isFinite(manualRate) || manualRate <= 0) {
      setStockRate(String(stockPurchaseRate));
    }
    const rateForValue =
      Number.isFinite(manualRate) && manualRate > 0
        ? manualRate
        : stockPurchaseRate;
    setStockValue((qty * rateForValue).toFixed(2));
  }, [stockPurchaseRate, stockQty, stockRate]);

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
    isCat6Plant(plantCode)
      ? "Miscellaneous"
      : plantCode.toUpperCase() === "UPCAST" ||
          plantCode.toUpperCase() === "LEDROPE" ||
          plantCode.toUpperCase() === "SIGNALLING" ||
          plantCode.toUpperCase() === "SLSSL" ||
          plantCode.toUpperCase() === "QUAD"
        ? "Electricity"
        : "Fuel & Power",
  );
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseOpeningReading, setExpenseOpeningReading] = useState("");
  const [expenseClosingReading, setExpenseClosingReading] = useState("");
  const [expensePhotos, setExpensePhotos] = useState<string[]>([]);
  const [expenseRate, setExpenseRate] = useState("");
  const [expenseMonth, setExpenseMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rentCoveredArea, setRentCoveredArea] = useState("");
  const [rentRatePerSqft, setRentRatePerSqft] = useState("12");
  const [farVendor, setFarVendor] = useState("");
  const [farVendorOther, setFarVendorOther] = useState("");
  const [farDescription, setFarDescription] = useState("");
  const [farBillNumber, setFarBillNumber] = useState("");
  const [farCost, setFarCost] = useState("");
  const [farGst, setFarGst] = useState("");
  const [farDepPercent, setFarDepPercent] = useState(String(PVC_FAR_DEP_PERCENT));
  const [unloadQtyMt, setUnloadQtyMt] = useState("");
  const [unloadRatePerMt, setUnloadRatePerMt] = useState(
    String(PVC_UNLOADING_RATE_PER_MT),
  );
  const [fetchedPurchaseKg, setFetchedPurchaseKg] = useState<number>(0);
  const [upcastMiscNature, setUpcastMiscNature] = useState<string>(
    UPCAST_MISC_NATURES[0],
  );
  const [expensePayMode, setExpensePayMode] = useState<"Cash" | "Bank">("Cash");

  useEffect(() => {
    if (
      isPvcStyleExpense &&
      kind === "expense" &&
      (expenseHead === "Unloading of MT" || expenseHead === "Unloading MT") &&
      entryDate
    ) {
      fetch(
        `/api/plants/${plantId}/purchases?from=${encodeURIComponent(entryDate)}&to=${encodeURIComponent(entryDate)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          const qty = Number(data?.totals?.quantity) || 0;
          setFetchedPurchaseKg(qty);
        })
        .catch(() => setFetchedPurchaseKg(0));
    }
  }, [isPvcStyleExpense, kind, expenseHead, entryDate, plantId]);

  useEffect(() => {
    if (expenseHead === "Electricity" || expenseHead === "Fuel & Power") {
      const opening = Number(expenseOpeningReading) || 0;
      const closing = Number(expenseClosingReading) || 0;
      const rate = Number(expenseRate) || 0;
      const consumed = Math.max(0, closing - opening);
      const calculatedAmt = consumed * rate;
      setExpenseAmount(calculatedAmt > 0 ? String(calculatedAmt.toFixed(2)) : "");
    }
  }, [expenseOpeningReading, expenseClosingReading, expenseRate, expenseHead]);

  const currentPurchaseKg = purchaseLines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0),
    0,
  );
  const effectivePurchaseKg =
    currentPurchaseKg > 0 ? currentPurchaseKg : fetchedPurchaseKg;
  const calculatedUnloadMt = (effectivePurchaseKg / 1000).toFixed(3);
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

  const activeModules = checklist[reportShift].filter(
    (m) => m.key !== "productionFilled" && allowedModuleKeys.has(m.key),
  );
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
    setExpenseHead(
      isCat6
        ? "Miscellaneous"
        : isUpcast ||
            plantCode.toUpperCase() === "LEDROPE" ||
            plantCode.toUpperCase() === "SIGNALLING" ||
            plantCode.toUpperCase() === "SLSSL" ||
            plantCode.toUpperCase() === "QUAD"
          ? "Electricity"
          : "Fuel & Power",
    );
    setPurchaseSource("vendor");
    setExpenseAmount("");
    setPaidTo("");
    setExpenseDesc(isCat6 ? "Salary" : "");
    setExpenseOpeningReading("");
    setExpenseClosingReading("");
    setExpenseRate("");
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

  useEffect(() => {
    if (plantId) {
      void syncChecklistFromServer();
    }
  }, [plantId, date]);

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
          {
            modules: { key: TodayModuleKey; filled: boolean }[];
          }
        >;
        customSuppliers?: string[];
        customCustomers?: string[];
        customStockItems?: string[];
        customFarVendors?: string[];
      };
      if (json.customSuppliers) setCustomSuppliers(json.customSuppliers);
      if (json.customCustomers) setCustomCustomers(json.customCustomers);
      if (json.customStockItems) setCustomStockItems(json.customStockItems);
      if (json.customFarVendors) setCustomFarVendors(json.customFarVendors);

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

      for (let i = 0; i < purchaseLines.length; i++) {
        const l = purchaseLines[i];
        const desc = l.itemDescription.trim();
        const qty = Number(l.quantity);
        const rate = Number(l.rate);

        if (purchaseLines.length === 1 || desc || l.quantity || l.rate) {
          if (!desc) {
            fail(`Select or enter description for item ${i + 1}.`);
            return;
          }
          if (!(qty > 0)) {
            fail(`Enter a valid quantity greater than 0 for item ${i + 1}.`);
            return;
          }
          if (!(rate >= 0) || isNaN(rate)) {
            fail(`Enter a valid rate for item ${i + 1}.`);
            return;
          }
        }
      }

      const items = purchaseLines
        .map((l) => ({
          itemDescription: l.itemDescription.trim(),
          unit: l.unit.trim() || "KGS",
          quantity: Number(l.quantity),
          debitQuantity: l.debitQuantity ? Number(l.debitQuantity) : 0,
          openingReading: l.openingReading ? Number(l.openingReading) : null,
          closingReading: l.closingReading ? Number(l.closingReading) : null,
          rate: Number(l.rate),
          gstPercent: isCat6 ? 0 : Number(l.gstPercent) || 0,
        }))
        .filter((l) => l.itemDescription && l.quantity > 0);
      if (
        (purchaseSource !== "atcl") &&
        (!resolvedVendorName || items.length === 0)
      ) {
        fail("Add supplier and at least one description item.");
        return;
      }
      if (purchaseSource === "atcl" && items.length === 0) {
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
          purchaseSource === "atcl"
            ? PVC_ATCL_VENDOR_NAME
            : resolvedVendorName,
        billNumber: billNumber || null,
        billDate: entryDate,
        gstin: isCat6 ? purchaseGstin.trim() || null : null,
        booksDate: isCat6 ? purchaseBooksDate || entryDate : null,
        notes:
          purchaseSource === "atcl"
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

      for (let i = 0; i < saleLines.length; i++) {
        const l = saleLines[i];
        const desc = l.itemDescription.trim();
        const qty = Number(l.quantity);
        const rate = Number(l.rate);

        if (saleLines.length === 1 || desc || l.quantity || l.rate) {
          if (!desc) {
            fail(`Select or enter product details for item ${i + 1}.`);
            return;
          }
          if (!(qty > 0)) {
            fail(`Enter a valid quantity greater than 0 for item ${i + 1}.`);
            return;
          }
          if (!(rate >= 0) || isNaN(rate)) {
            fail(`Enter a valid rate for item ${i + 1}.`);
            return;
          }
        }
      }

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
        notes: saleRemarks.trim() || null,
        billPhotoUrls: invoicePhotos,
        items,
      });
    } else if (kind === "stock") {
      const resolvedItem = resolvedStockItemName;
      const issuedQty = Number(stockQty);
      const manualRate = Number(stockRate);
      const closingRate =
        Number.isFinite(manualRate) && manualRate >= 0
          ? manualRate
          : stockPurchaseRate != null && Number.isFinite(stockPurchaseRate)
            ? stockPurchaseRate
            : NaN;
      const closingValue = issuedQty * closingRate;
      if (!resolvedItem || stockQty === "") {
        fail(
          (stockItem === "Others" || stockItem === "Other") &&
            !stockItemOther.trim()
            ? "Enter the other item name."
            : "Enter stock category, item, and quantity.",
        );
        return;
      }
      if (!Number.isFinite(closingRate) || closingRate < 0) {
        fail(
          "Enter a rate, or select an item that already has purchase history for this plant.",
        );
        return;
      }
      if (!(issuedQty >= 0)) {
        fail("Quantity must be zero or more.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/stock`, {
        date: entryDate,
        shift,
        itemName: resolvedItem,
        category:
          stockCategory === "Other" ? "RM" : stockCategory,
        unit: usesStockLedger
          ? stockUnit || "KGS"
          : isCat6
            ? stockUnit || stockCatalog.defaultUnit || "NOS"
            : "kg",
        quantity: issuedQty,
        rate: closingRate,
        value: closingValue,
        notes: isPvc
          ? pvcStockEntryNotes(stockType, entryDate, stockNotes)
          : isUpcast
            ? stockNotes.trim() ||
              `Issued quantity as on ${entryDate}`
            : stockNotes.trim() || `Closing stock as on ${entryDate}`,
        photoUrls: stockPhotos,
      });
    } else if (kind === "expense") {
      if (expenseHead === "Factory Rent") {
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
          dailyDate: entryDate,
          shift,
          expenseHead: "Factory Rent",
          payMode: expensePayMode,
        });
      } else if (
        expenseHead === "Electricity" ||
        expenseHead === "Fuel & Power"
      ) {
        const opening =
          expenseOpeningReading === ""
            ? null
            : Number(expenseOpeningReading);
        const closing =
          expenseClosingReading === ""
            ? null
            : Number(expenseClosingReading);
        const rate = Number(expenseRate) || 0;
        const consumed =
          opening != null &&
          closing != null &&
          Number.isFinite(opening) &&
          Number.isFinite(closing)
            ? Math.max(0, closing - opening)
            : null;
        const billAmount =
          consumed != null && rate > 0
            ? Math.round(consumed * rate * 100) / 100
            : Number(expenseAmount);
        if (!(billAmount > 0)) {
          fail("Enter rate and readings so the electricity bill amount is calculated.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/electricity`, {
          month: expenseMonth || entryDate.slice(0, 7),
          openingReading: opening,
          closingReading: closing,
          consumedUnits: consumed,
          billAmount,
          notes: expenseDesc.trim() || null,
          dailyDate: entryDate,
          shift,
          expenseHead: expenseHead,
          payMode: expensePayMode,
        });
      } else if (
        expenseHead === "FAR" ||
        expenseHead === "Depreciation (FAR)"
      ) {
        const cost = Number(farCost);
        const gst =
          farGst === ""
            ? Math.round(cost * 0.18 * 100) / 100
            : Number(farGst);
        const vendor =
          farVendor === "Other"
            ? farVendorOther.trim()
            : farVendor.trim();
        if (!farDescription.trim() || !(cost > 0)) {
          fail("Enter asset description and actual cost.");
          return;
        }
        if (!(gst >= 0)) {
          fail("Enter a valid GST amount.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/assets`, {
          assetDescription: farDescription.trim(),
          vendor: vendor || null,
          billNumber: farBillNumber.trim() || null,
          billDate: entryDate || null,
          cost,
          gst,
          depreciationPercent: Number(farDepPercent) || PVC_FAR_DEP_PERCENT,
        });
      } else if (
        isPvcStyleExpense &&
        (expenseHead === "Unloading of MT" || expenseHead === "Unloading MT")
      ) {
        const qty =
          Number(unloadQtyMt) > 0
            ? Number(unloadQtyMt)
            : Number(calculatedUnloadMt);
        const rate =
          Number(unloadRatePerMt) > 0
            ? Number(unloadRatePerMt)
            : PVC_UNLOADING_RATE_PER_MT;
        const amount = qty * rate;
        if (!(qty > 0) || !(amount > 0)) {
          fail(
            "Enter unloading MT manually, or enter purchases for this date to auto-calculate.",
          );
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          payMode: expensePayMode,
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
      } else if (
        isPvcStyleExpense &&
        (expenseHead === "Labour Contractor" ||
          expenseHead === "Contractor Wages")
      ) {
        const amount = Number(expenseAmount);
        if (!(amount > 0)) {
          fail("Enter contractor wages amount.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          entryType: "EXPENSE",
          payMode: expensePayMode,
          expenseHead: isUpcast ? "Contractor Wages" : "Labour Contractor",
          description:
            [paidTo && `Paid to: ${paidTo}`, expenseDesc.trim() || "Contractor wages"]
              .filter(Boolean)
              .join(" · "),
          amount,
          contractorSalary: amount,
          supervisorSalary: 0,
          billPhotoUrls: expensePhotos,
        });
      } else if (isPvcStyleExpense && expenseHead === "Salary Expenses") {
        const amount = Number(expenseAmount);
        if (!(amount > 0)) {
          fail("Enter salary amount.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          entryType: "EXPENSE",
          payMode: expensePayMode,
          expenseHead: "Salary Expenses",
          description:
            [paidTo && `Paid to: ${paidTo}`, expenseDesc.trim() || "Salary expenses"]
              .filter(Boolean)
              .join(" · "),
          amount,
          contractorSalary: 0,
          supervisorSalary: amount,
          billPhotoUrls: expensePhotos,
        });
      } else if (isUpcast && expenseHead === "Miscellaneous") {
        const amount = Number(expenseAmount);
        const nature = upcastMiscNature.trim();
        if (!(amount > 0) || !nature) {
          fail("Select nature of expense and enter amount.");
          return;
        }
        result = await postJson(`/api/plants/${plantId}/petty-cash`, {
          date: entryDate,
          shift,
          entryType: "EXPENSE",
          payMode: expensePayMode,
          expenseHead: nature,
          nature,
          description:
            [paidTo && `Paid to: ${paidTo}`, expenseDesc.trim()]
              .filter(Boolean)
              .join(" · ") || nature,
          amount,
          contractorSalary: 0,
          supervisorSalary: 0,
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
          entryType: "EXPENSE",
          payMode: isCat6
            ? "CASH"
            : isPvcStyleExpense
              ? expensePayMode
              : paidTo.trim() || "CASH",
          expenseHead: String(expenseHead),
          description:
            (isCat6
              ? expenseDesc.trim() ||
                (expenseHead === "Miscellaneous" ? "Salary" : "")
              : [paidTo && `Paid to: ${paidTo}`, expenseDesc]
                  .filter(Boolean)
                  .join(" · ")) || null,
          openingReading: null,
          closingReading: null,
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
        {(() => {
          const showShift =
            kind !== "contactList" &&
            kind !== "purchase" &&
            kind !== "sale" &&
            !isCat6;
          return (
            <div className={`form-grid ${showShift ? "three" : "two"}`}>
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
              {showShift && (
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
          );
        })()}

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
                <div className="field">
                  <label htmlFor="p-source">Purchase source</label>
                  <SelectMenu
                    id="p-source"
                    value={
                      purchaseSource === "atcl"
                        ? "Stock Taken from ATCL"
                        : "Purchase from Vendor"
                    }
                    options={[
                      "Purchase from Vendor",
                      "Stock Taken from ATCL",
                    ]}
                    required
                    onChange={(label) => {
                      if (label === "Stock Taken from ATCL")
                        setPurchaseSource("atcl");
                      else setPurchaseSource("vendor");
                    }}
                  />
                </div>
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
                {isQuad && purchaseSource !== "atcl" ? (
                  <LineEditor
                    lines={purchaseLines}
                    onChange={setPurchaseLines}
                    defaultUnit="KGS"
                    itemLabel="Raw Material"
                    itemOptions={["", ...purchaseCatalog.goods]}
                    itemPlaceholder="Select raw material"
                    unitOptions={PRODUCT_UNITS}
                    showGst={true}
                    showDebitQty={true}
                  />
                ) : null}
                {purchaseSource === "atcl" ? null : (
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="p-vendor">
                      {isCat6 || isQuad ? "Vendor's Name" : "Supplier name"}
                    </label>
                    <SelectMenu
                      id="p-vendor"
                      value={vendorName}
                      options={purchaseSupplierOptions}
                      required
                      disabled={isQuad && !quadSelectedMaterial}
                      placeholder={
                        isQuad && !quadSelectedMaterial
                          ? "Select raw material first"
                          : "Select supplier"
                      }
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
                {purchaseSource === "atcl" ? (
                  <div className="field">
                    <label htmlFor="p-bill-atcl">Challan no.</label>
                    <input
                      id="p-bill-atcl"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                    />
                  </div>
                ) : null}
                {vendorName === "Other" ? (
                  <div className="field">
                    <label htmlFor="p-vendor-other">Vendor&apos;s Name <span style={{ color: "red" }}>*</span></label>
                    <input
                      id="p-vendor-other"
                      required
                      placeholder="Enter vendor name"
                      value={vendorNameOther}
                      onChange={(e) => setVendorNameOther(e.target.value)}
                    />
                  </div>
                ) : null}
                {!isQuad || purchaseSource === "atcl" ? (
                <LineEditor
                  lines={purchaseLines}
                  onChange={setPurchaseLines}
                  defaultUnit={isCat6 ? "NOS" : "KGS"}
                  itemLabel={
                    purchaseSource === "atcl"
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
                  showGst={!isCat6 && purchaseSource !== "atcl"}
                  showDebitQty={true}
                />
                ) : null}
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
                ) : isPvc ? (
                <div className="field">
                  <label htmlFor="s-cust">Customer</label>
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
                      options={cat6CustomerOptions}
                      required
                      onChange={(next) => {
                        setCustomerName(next);
                        if (next !== "Other") setCustomerNameOther("");
                      }}
                    />
                  </div>
                </div>
                )}
                {customerName === "Other" ? (
                  <div className="field">
                    <label htmlFor="s-cust-other">Customer Name <span style={{ color: "red" }}>*</span></label>
                    <input
                      id="s-cust-other"
                      required
                      placeholder="Enter customer name"
                      value={customerNameOther}
                      onChange={(e) => setCustomerNameOther(e.target.value)}
                    />
                  </div>
                ) : null}
                {!isCat6 && !isPvc && saleType === "OTHERS" ? (
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
                  defaultUnit={isCat6 ? "NOS" : isPvc ? "KG" : PRODUCTS[0].unit}
                  itemLabel="Item Details"
                  itemOptions={saleProducts}
                  unitOptions={
                    isCat6 ? CAT6_LINE_UNITS : isPvc ? ["KG", "Other"] : PRODUCT_UNITS
                  }
                  showCat6MeterFields={isCat6}
                  resolveUnitForItem={(name) =>
                    isPvc ? "KG" : PRODUCTS.find((p) => p.name === name)?.unit
                  }
                />
                <div className="field">
                  <label htmlFor="s-remarks">Remarks</label>
                  <input
                    id="s-remarks"
                    value={saleRemarks}
                    onChange={(e) => setSaleRemarks(e.target.value)}
                    placeholder="Optional remarks"
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
                {usesStockLedger ? (
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
                    {usesStockLedger ? "Particulars" : "Item"}
                  </label>
                  <SelectMenu
                    id="st-item"
                    value={stockItem || stockParticulars[0]}
                    options={stockParticulars}
                    required
                    onChange={(next) => {
                      setStockItem(next);
                      if (next !== "Others" && next !== "Other")
                        setStockItemOther("");
                    }}
                  />
                </div>
                {stockItem === "Others" || stockItem === "Other" ? (
                  <div className="field">
                    <label htmlFor="st-item-other">
                      {usesStockLedger ? "Other particulars" : "Other item"} <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      id="st-item-other"
                      required
                      placeholder={
                        usesStockLedger
                          ? "Enter particulars"
                          : "Enter item name"
                      }
                      value={stockItemOther}
                      onChange={(e) => setStockItemOther(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="prod-fields__row">
                  <div className="field">
                    <label htmlFor="st-qty">
                      {isUpcast
                        ? "Issued quantity"
                        : usesStockLedger
                          ? "Closing Stock"
                          : "Quantity"}
                    </label>
                    <DecimalInput
                      id="st-qty"
                      required
                      value={stockQty}
                      onChange={(next) => {
                        setStockQty(next);
                        if (!isUpcast) {
                          const qty = Number(next);
                          const rate = Number(stockRate);
                          if (
                            usesStockLedger &&
                            Number.isFinite(qty) &&
                            Number.isFinite(rate)
                          ) {
                            setStockValue((qty * rate).toFixed(2));
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="st-unit">Unit</label>
                    {usesStockLedger || isCat6 ? (
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
                <div className="prod-fields__row">
                  <div className="field">
                    <label htmlFor="st-rate">Rate</label>
                    <DecimalInput
                      id="st-rate"
                      required
                      value={stockRate}
                      onChange={setStockRate}
                    />
                  </div>
                </div>
                {stockPurchaseRateLoading ? (
                  <p className="field-hint">Loading rate from purchase history…</p>
                ) : null}
                {stockPurchaseRate != null ? (
                  <p className="field-hint">
                    Suggested from purchase history: ₹{stockPurchaseRate.toFixed(2)}/
                    {stockUnit || "KGS"} (weighted average — edit if needed)
                    {stockValue ? ` · Value: ${formatINR(Number(stockValue))}` : ""}
                  </p>
                ) : resolvedStockItemName ? (
                  <p className="field-hint">
                    No purchase history matched this item — enter rate manually (purchase
                    today is not required).
                  </p>
                ) : null}
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
                  label="Upload stock images (optional)"
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
                        setExpenseRate("");
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
                {expenseHead === "Factory Rent" ? (
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
                ) : expenseHead === "Electricity" ||
                  expenseHead === "Fuel & Power" ? (
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
                    {expenseOpeningReading !== "" &&
                    expenseClosingReading !== "" ? (
                      <p className="cost-hint">
                        Consumed units{" "}
                        <span className="cost-hint__amount">
                          {Math.max(
                            0,
                            Number(expenseClosingReading) -
                              Number(expenseOpeningReading),
                          ).toFixed(2)}
                        </span>
                      </p>
                    ) : null}
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="e-rate">Rate (₹/unit)</label>
                        <DecimalInput
                          id="e-rate"
                          required
                          value={expenseRate}
                          onChange={setExpenseRate}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="e-amt">Electricity bill Amt</label>
                        <input
                          id="e-amt"
                          readOnly
                          style={{ backgroundColor: "#f3f4f6" }}
                          value={expenseAmount}
                          placeholder="Calculated automatically"
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
                  </>
                ) : expenseHead === "FAR" ||
                  expenseHead === "Depreciation (FAR)" ? (
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
                        <label htmlFor="far-vendor-other">Supplier (other) <span style={{ color: "red" }}>*</span></label>
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
                        <label htmlFor="far-cost">Billing Price (₹)</label>
                        <DecimalInput
                          id="far-cost"
                          required
                          value={farCost}
                          onChange={(next) => {
                            setFarCost(next);
                            const cost = Number(next);
                            if (Number.isFinite(cost) && cost > 0 && farGst === "") {
                              setFarGst((cost * 0.18).toFixed(2));
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="far-gst">GST @18% (₹)</label>
                        <DecimalInput
                          id="far-gst"
                          value={farGst}
                          onChange={setFarGst}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="far-invoice">Invoice Value</label>
                        <input
                          id="far-invoice"
                          readOnly
                          value={formatINR(
                            (Number(farCost) || 0) +
                              (farGst === ""
                                ? (Number(farCost) || 0) * 0.18
                                : Number(farGst) || 0),
                          )}
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
                ) : isPvcStyleExpense &&
                  (expenseHead === "Unloading of MT" ||
                    expenseHead === "Unloading MT") ? (
                  <>
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="e-unload-mt">Quantity (MT)</label>
                        <DecimalInput
                          id="e-unload-mt"
                          value={
                            unloadQtyMt ||
                            (Number(calculatedUnloadMt) > 0
                              ? calculatedUnloadMt
                              : "")
                          }
                          onChange={setUnloadQtyMt}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="e-unload-rate">Rate (₹/MT)</label>
                        <DecimalInput
                          id="e-unload-rate"
                          value={unloadRatePerMt}
                          onChange={setUnloadRatePerMt}
                        />
                      </div>
                    </div>
                    <p className="cost-hint">
                      Unloading amount{" "}
                      <span className="cost-hint__amount">
                        {formatINR(
                          (Number(unloadQtyMt) > 0
                            ? Number(unloadQtyMt)
                            : Number(calculatedUnloadMt) || 0) *
                            (Number(unloadRatePerMt) > 0
                              ? Number(unloadRatePerMt)
                              : PVC_UNLOADING_RATE_PER_MT),
                        )}
                      </span>
                      {Number(calculatedUnloadMt) > 0 && !unloadQtyMt ? (
                        <> · from purchase qty today</>
                      ) : null}
                    </p>
                    <div className="field">
                      <label htmlFor="e-paid">{t("paidTo")}</label>
                      <input
                        id="e-paid"
                        value={paidTo}
                        onChange={(e) => setPaidTo(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="e-pay-mode">Pay Mode</label>
                      <SelectMenu
                        id="e-pay-mode"
                        value={expensePayMode}
                        options={["Cash", "Bank"]}
                        required
                        onChange={(next) =>
                          setExpensePayMode(next === "Bank" ? "Bank" : "Cash")
                        }
                      />
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
                ) : isUpcast && expenseHead === "Miscellaneous" ? (
                  <>
                    <div className="field">
                      <label htmlFor="e-pay-mode">Pay Mode</label>
                      <SelectMenu
                        id="e-pay-mode"
                        value={expensePayMode}
                        options={["Cash", "Bank"]}
                        required
                        onChange={(next) =>
                          setExpensePayMode(next === "Bank" ? "Bank" : "Cash")
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="e-misc-nature">Nature of Expense</label>
                      <SelectMenu
                        id="e-misc-nature"
                        value={upcastMiscNature}
                        options={[...UPCAST_MISC_NATURES]}
                        required
                        onChange={setUpcastMiscNature}
                      />
                    </div>
                    <div className="prod-fields__row">
                      <div className="field">
                        <label htmlFor="e-amt">Factory Expense</label>
                        <DecimalInput
                          id="e-amt"
                          required
                          value={expenseAmount}
                          onChange={setExpenseAmount}
                        />
                      </div>
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
                      <label htmlFor="e-desc">Description of Expense</label>
                      <textarea
                        id="e-desc"
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        rows={4}
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
                {isPvcStyleExpense ? (
                  <div className="field">
                    <label htmlFor="e-pay-mode">Pay Mode</label>
                    <SelectMenu
                      id="e-pay-mode"
                      value={expensePayMode}
                      options={["Cash", "Bank"]}
                      required
                      onChange={(next) =>
                        setExpensePayMode(next === "Bank" ? "Bank" : "Cash")
                      }
                    />
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
  showDebitQty = false,
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
  showDebitQty?: boolean;
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
                  value={
                    itemOptions.includes(line.itemDescription)
                      ? line.itemDescription
                      : line.itemDescription === ""
                        ? ""
                        : itemOptions.includes("Other")
                          ? "Other"
                          : itemOptions.includes("Others")
                            ? "Others"
                            : ""
                  }
                  options={itemOptions}
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

          {itemOptions &&
          (line.itemDescription === "Other" ||
            line.itemDescription === "Others" ||
            (line.itemDescription !== "" &&
              !itemOptions.includes(line.itemDescription))) ? (
            <div className="line-stack__row" style={{ marginTop: "0.2rem", marginBottom: "0.5rem" }}>
              <div className="field" style={{ margin: 0, flex: 1 }}>
                <label htmlFor={`line-item-custom-${line.id}`}>
                  Custom Description <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  id={`line-item-custom-${line.id}`}
                  value={
                    line.itemDescription === "Other" ||
                    line.itemDescription === "Others"
                      ? ""
                      : line.itemDescription
                  }
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = {
                      ...line,
                      itemDescription:
                        e.target.value ||
                        (itemOptions.includes("Other") ? "Other" : "Others"),
                    };
                    onChange(next);
                  }}
                  placeholder="Enter custom description"
                />
              </div>
            </div>
          ) : null}

          {showDebitQty ? (
            <>
              <div className="line-stack__row line-stack__row--meta has-unit cols-3">
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
                    value={line.rate}
                    onChange={(rate) => {
                      const next = [...lines];
                      next[idx] = { ...line, rate };
                      onChange(next);
                    }}
                  />
                </div>
              </div>
              <div className="line-stack__row line-stack__row--meta line-stack__row--debit-rate cols-3">
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-debit-qty-${line.id}`}>Debit Qty</label>
                  <DecimalInput
                    id={`line-debit-qty-${line.id}`}
                    value={line.debitQuantity ?? ""}
                    onChange={(debitQuantity) => {
                      const next = [...lines];
                      next[idx] = { ...line, debitQuantity };
                      onChange(next);
                    }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-debit-value-${line.id}`}>Debit Value</label>
                  <input
                    id={`line-debit-value-${line.id}`}
                    readOnly
                    value={
                      Number(line.debitQuantity || 0) > 0 && Number(line.rate || 0) > 0
                        ? (
                            Number(line.debitQuantity || 0) * Number(line.rate || 0)
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"
                    }
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`line-net-value-${line.id}`}>
                    Net value (after debit)
                  </label>
                  <input
                    id={`line-net-value-${line.id}`}
                    readOnly
                    value={
                      Number(line.rate || 0) > 0
                        ? (
                            Math.max(
                              0,
                              Number(line.quantity || 0) -
                                Number(line.debitQuantity || 0),
                            ) * Number(line.rate || 0)
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"
                    }
                  />
                </div>
              </div>
              {showGst ? (
                <div className="line-stack__row line-stack__row--meta">
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
                </div>
              ) : null}
            </>
          ) : (
            <div
              className={`line-stack__row line-stack__row--meta${showGst ? " has-gst" : ""}${unitOptions ? " has-unit" : ""}`}
            >
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
          )}
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
