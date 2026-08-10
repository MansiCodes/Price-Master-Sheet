"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson, todayLocalISO } from "@/lib/client-forms";
import { formatINR } from "@/lib/format/inr";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import "./today-hub.css";

export type TodayModuleKey =
  | "purchaseFilled"
  | "saleFilled"
  | "stockFilled"
  | "manpowerFilled"
  | "pettyCashFilled";

export type TodayModuleStatus = {
  key: TodayModuleKey;
  label: string;
  filled: boolean;
};

type EntryKind = "purchase" | "sale" | "production" | "expense" | "stock" | null;

type LineItem = {
  id: string;
  itemDescription: string;
  unit: string;
  quantity: string;
  rate: string;
};

type StockLine = {
  id: string;
  itemName: string;
  category: "RM" | "WIP" | "FG";
  unit: string;
  quantity: string;
  rate: string;
};

const PURCHASE_TYPES = [
  "RAW_MATERIAL",
  "PACKING",
  "CONSUMABLE",
  "ASSET",
  "CAPITAL_GOOD",
] as const;

const EXPENSE_HEADS = [
  "Electricity",
  "Transport",
  "Maintenance",
  "Office",
  "Miscellaneous",
] as const;

function newLine(unit = "kg"): LineItem {
  return {
    id: crypto.randomUUID(),
    itemDescription: "",
    unit,
    quantity: "",
    rate: "",
  };
}

function newStockLine(): StockLine {
  return {
    id: crypto.randomUUID(),
    itemName: "",
    category: "RM",
    unit: "kg",
    quantity: "",
    rate: "",
  };
}

type TodayHubProps = {
  plantId: string;
  plantName: string;
  plantCode: string;
  date: string;
  modules: TodayModuleStatus[];
  canEnter: boolean;
  /** When true, hide plant hero — parent Dashboard already shows it. */
  embedded?: boolean;
};

export function TodayHub({
  plantId,
  plantName,
  plantCode,
  date,
  modules,
  canEnter,
  embedded = false,
}: TodayHubProps) {
  const router = useRouter();
  const today = useMemo(() => todayLocalISO(), []);
  const completed = modules.filter((m) => m.filled).length;
  const total = modules.length;
  const allDone = completed === total && total > 0;

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EntryKind>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Shared / purchase
  const [entryDate, setEntryDate] = useState(date || today);
  const [purchaseType, setPurchaseType] =
    useState<(typeof PURCHASE_TYPES)[number]>("RAW_MATERIAL");
  const [vendorName, setVendorName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [gstPercent, setGstPercent] = useState("18");
  const [purchaseLines, setPurchaseLines] = useState<LineItem[]>([newLine()]);

  // Sale
  const [customerName, setCustomerName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleLines, setSaleLines] = useState<LineItem[]>([newLine("KM")]);

  // Production
  const [shift, setShift] = useState<"DAY" | "NIGHT">("DAY");
  const [productName, setProductName] = useState("");
  const [prodQty, setProdQty] = useState("");
  const [prodUnit, setProdUnit] = useState("KM");
  const [mgr, setMgr] = useState("1");
  const [ops, setOps] = useState("8");
  const [helpers, setHelpers] = useState("4");

  // Expense
  const [expenseHead, setExpenseHead] =
    useState<(typeof EXPENSE_HEADS)[number] | string>("Electricity");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");

  // Stock check
  const [stockLines, setStockLines] = useState<StockLine[]>([newStockLine()]);

  const manpowerCost =
    Number(mgr || 0) * 4000 + Number(ops || 0) * 1500 + Number(helpers || 0) * 800;

  function openAdd() {
    setError(null);
    setKind(null);
    setEntryDate(date || today);
    setOpen(true);
  }

  function resetAll() {
    setPurchaseType("RAW_MATERIAL");
    setVendorName("");
    setBillNumber("");
    setGstPercent("18");
    setPurchaseLines([newLine()]);
    setCustomerName("");
    setInvoiceNo("");
    setSaleLines([newLine("KM")]);
    setShift("DAY");
    setProductName("");
    setProdQty("");
    setProdUnit("KM");
    setMgr("1");
    setOps("8");
    setHelpers("4");
    setExpenseHead("Electricity");
    setExpenseAmount("");
    setPaidTo("");
    setExpenseDesc("");
    setStockLines([newStockLine()]);
  }

  function closePanel() {
    setOpen(false);
    setKind(null);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!kind) return;
    setSaving(true);
    setError(null);

    let result: { ok: true; data: unknown } | { ok: false; error: string };

    if (kind === "purchase") {
      const items = purchaseLines
        .map((l) => ({
          itemDescription: l.itemDescription.trim(),
          unit: l.unit.trim() || "kg",
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          gstPercent: Number(gstPercent) || 0,
        }))
        .filter((l) => l.itemDescription && l.quantity > 0);
      if (!vendorName.trim() || items.length === 0) {
        setSaving(false);
        setError("Add vendor and at least one item.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/purchases`, {
        date: entryDate,
        type: purchaseType,
        vendorName: vendorName.trim(),
        billNumber: billNumber || null,
        items,
      });
    } else if (kind === "sale") {
      const items = saleLines
        .map((l) => ({
          itemDescription: l.itemDescription.trim(),
          unit: l.unit.trim() || "KM",
          quantity: Number(l.quantity),
          rate: Number(l.rate),
        }))
        .filter((l) => l.itemDescription && l.quantity > 0);
      if (!customerName.trim() || items.length === 0) {
        setSaving(false);
        setError("Add customer and at least one product.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/sales`, {
        date: entryDate,
        type: "FINISHED_GOOD",
        customerName: customerName.trim(),
        billNumber: invoiceNo || null,
        items,
      });
    } else if (kind === "production") {
      if (!productName.trim() || !(Number(prodQty) > 0)) {
        setSaving(false);
        setError("Enter product and production quantity.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/production`, {
        date: entryDate,
        shift,
        productName: productName.trim(),
        quantity: Number(prodQty),
        unit: prodUnit.trim() || "KM",
        manpower: {
          manager: Number(mgr) || 0,
          operator: Number(ops) || 0,
          helper: Number(helpers) || 0,
        },
      });
    } else if (kind === "expense") {
      const amount = Number(expenseAmount);
      if (!(amount > 0) || !expenseHead) {
        setSaving(false);
        setError("Enter category and amount.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/petty-cash`, {
        date: entryDate,
        payMode: "CASH",
        expenseHead: String(expenseHead),
        description: [paidTo && `Paid to: ${paidTo}`, expenseDesc]
          .filter(Boolean)
          .join(" · ") || null,
        amount,
        contractorSalary: 0,
        supervisorSalary: 0,
      });
    } else {
      const entries = stockLines
        .map((l) => ({
          itemName: l.itemName.trim(),
          category: l.category,
          unit: l.unit.trim() || "kg",
          quantity: Number(l.quantity),
          rate: Number(l.rate) || 0,
        }))
        .filter((l) => l.itemName && l.quantity >= 0);
      if (entries.length === 0) {
        setSaving(false);
        setError("Add at least one stock item.");
        return;
      }
      result = await postJson(`/api/plants/${plantId}/stock`, {
        date: entryDate,
        entries,
      });
    }

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const labels: Record<Exclude<EntryKind, null>, string> = {
      purchase: "Purchase saved",
      sale: "Sale saved",
      production: "Production & manpower saved",
      expense: "Expense saved",
      stock: "Stock check saved",
    };
    setOk(labels[kind]);
    closePanel();
    resetAll();
    router.refresh();
  }

  const title =
    kind === null
      ? "What do you want to add?"
      : kind === "purchase"
        ? "Purchase"
        : kind === "sale"
          ? "Sale"
          : kind === "production"
            ? "Daily production"
            : kind === "expense"
              ? "Expense"
              : "Stock check";

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

      {ok ? <Alert type="ok">{ok}</Alert> : null}

      <section className="today-card">
        <h2 className="today-card__title">Today&apos;s report</h2>
        <ul className="today-checklist">
          {modules.map((mod) => (
            <li
              key={mod.key}
              className={`today-check ${mod.filled ? "today-check--done" : ""}`}
            >
              <span className="today-check__label">{mod.label}</span>
              <span className="today-check__mark" aria-hidden>
                {mod.filled ? "✓" : "○"}
              </span>
            </li>
          ))}
        </ul>

        <div className="today-progress">
          <div className="today-progress__bar" aria-hidden>
            <div
              className="today-progress__fill"
              style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
            />
          </div>
          <p className="today-progress__label">
            {allDone
              ? "All set for today"
              : `${completed}/${total} complete`}
          </p>
        </div>

        {canEnter ? (
          <Button
            className="today-hub__cta"
            variant="primary"
            onClick={openAdd}
            style={{ width: "100%", marginTop: "1rem" }}
          >
            + Add today&apos;s entry
          </Button>
        ) : (
          <p className="page-sub" style={{ marginTop: "1rem", marginBottom: 0 }}>
            Viewer access — entries are read-only.
          </p>
        )}
      </section>

      <SlideOver
        open={open}
        onClose={closePanel}
        title={title}
        footer={
          kind ? (
            <>
              <Button variant="secondary" onClick={() => setKind(null)}>
                Back
              </Button>
              <Button
                type="submit"
                form="today-entry-form"
                disabled={saving}
                style={{ flex: 1 }}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closePanel} style={{ flex: 1 }}>
              Cancel
            </Button>
          )
        }
      >
        {error ? <Alert type="error">{error}</Alert> : null}

        {kind === null ? (
          <div className="entry-picker">
            <button
              type="button"
              className="entry-picker__btn entry-picker__btn--purchase"
              onClick={() => setKind("purchase")}
            >
              <span>Purchase</span>
              <span>Vendor bill · multi item</span>
            </button>
            <button
              type="button"
              className="entry-picker__btn entry-picker__btn--sale"
              onClick={() => setKind("sale")}
            >
              <span>Sale</span>
              <span>Invoice · multi product</span>
            </button>
            <button
              type="button"
              className="entry-picker__btn entry-picker__btn--production"
              onClick={() => setKind("production")}
            >
              <span>Production</span>
              <span>Includes manpower</span>
            </button>
            <button
              type="button"
              className="entry-picker__btn entry-picker__btn--expense"
              onClick={() => setKind("expense")}
            >
              <span>Expense</span>
              <span>Electricity, misc…</span>
            </button>
            <button
              type="button"
              className="entry-picker__btn entry-picker__btn--stock"
              onClick={() => setKind("stock")}
              style={{ gridColumn: "1 / -1" }}
            >
              <span>Stock check</span>
              <span>Physical count vs system (manager)</span>
            </button>
          </div>
        ) : (
          <form id="today-entry-form" className="form-grid" onSubmit={onSubmit}>
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

            {kind === "purchase" ? (
              <>
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="p-type">Type</label>
                    <select
                      id="p-type"
                      value={purchaseType}
                      onChange={(e) =>
                        setPurchaseType(e.target.value as (typeof PURCHASE_TYPES)[number])
                      }
                    >
                      {PURCHASE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="p-gst">GST %</label>
                    <input
                      id="p-gst"
                      type="number"
                      min={0}
                      step="0.01"
                      value={gstPercent}
                      onChange={(e) => setGstPercent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="p-vendor">Vendor</label>
                  <input
                    id="p-vendor"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Select / type vendor"
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
                <LineEditor
                  lines={purchaseLines}
                  onChange={setPurchaseLines}
                  defaultUnit="kg"
                />
              </>
            ) : null}

            {kind === "sale" ? (
              <>
                <div className="field">
                  <label htmlFor="s-cust">Customer</label>
                  <input
                    id="s-cust"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
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
                  defaultUnit="KM"
                  itemLabel="Product"
                />
              </>
            ) : null}

            {kind === "production" ? (
              <>
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
                <div className="field">
                  <label htmlFor="prod-name">Product</label>
                  <input
                    id="prod-name"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. CAT6"
                  />
                </div>
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="prod-qty">Production qty</label>
                    <input
                      id="prod-qty"
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={prodQty}
                      onChange={(e) => setProdQty(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="prod-unit">Unit</label>
                    <input
                      id="prod-unit"
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                    />
                  </div>
                </div>
                <h3 className="today-card__title" style={{ marginTop: "0.5rem" }}>
                  Manpower
                </h3>
                <div className="manpower-grid">
                  <div className="field">
                    <label htmlFor="m-mgr">Manager</label>
                    <input
                      id="m-mgr"
                      type="number"
                      min={0}
                      value={mgr}
                      onChange={(e) => setMgr(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="m-ops">Operator</label>
                    <input
                      id="m-ops"
                      type="number"
                      min={0}
                      value={ops}
                      onChange={(e) => setOps(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="m-help">Helper</label>
                    <input
                      id="m-help"
                      type="number"
                      min={0}
                      value={helpers}
                      onChange={(e) => setHelpers(e.target.value)}
                    />
                  </div>
                </div>
                <p className="cost-hint">
                  Est. manpower cost {formatINR(manpowerCost)} (rates from plant
                  settings)
                </p>
              </>
            ) : null}

            {kind === "expense" ? (
              <>
                <div className="field">
                  <label htmlFor="e-head">Category</label>
                  <select
                    id="e-head"
                    value={expenseHead}
                    onChange={(e) => setExpenseHead(e.target.value)}
                  >
                    {EXPENSE_HEADS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="e-amt">Amount</label>
                  <input
                    id="e-amt"
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
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
                <div className="field">
                  <label htmlFor="e-desc">Description</label>
                  <input
                    id="e-desc"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                  />
                </div>
              </>
            ) : null}

            {kind === "stock" ? (
              <StockEditor lines={stockLines} onChange={setStockLines} />
            ) : null}
          </form>
        )}
      </SlideOver>
    </div>
  );
}

function LineEditor({
  lines,
  onChange,
  defaultUnit,
  itemLabel = "Item",
}: {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  defaultUnit: string;
  itemLabel?: string;
}) {
  return (
    <div>
      <table className="line-table">
        <thead>
          <tr>
            <th>{itemLabel}</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => {
            const total = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
            return (
              <tr key={line.id}>
                <td>
                  <input
                    required={idx === 0}
                    value={line.itemDescription}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, itemDescription: e.target.value };
                      onChange(next);
                    }}
                    placeholder={itemLabel}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required={idx === 0}
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, quantity: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required={idx === 0}
                    value={line.rate}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, rate: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="line-total">{formatINR(total)}</td>
                <td>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label="Remove line"
                      onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
                    >
                      ✕
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...lines, newLine(defaultUnit)])}
        style={{ marginTop: "0.65rem" }}
      >
        + Add item
      </Button>
    </div>
  );
}

function StockEditor({
  lines,
  onChange,
}: {
  lines: StockLine[];
  onChange: (lines: StockLine[]) => void;
}) {
  return (
    <div>
      <table className="line-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Cat</th>
            <th>Actual</th>
            <th>Rate</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={line.id}>
              <td>
                <input
                  required={idx === 0}
                  value={line.itemName}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, itemName: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Copper"
                />
              </td>
              <td>
                <select
                  value={line.category}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = {
                      ...line,
                      category: e.target.value as StockLine["category"],
                    };
                    onChange(next);
                  }}
                >
                  <option value="RM">RM</option>
                  <option value="WIP">WIP</option>
                  <option value="FG">FG</option>
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required={idx === 0}
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, quantity: e.target.value };
                    onChange(next);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={line.rate}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, rate: e.target.value };
                    onChange(next);
                  }}
                />
              </td>
              <td>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
                  >
                    ✕
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...lines, newStockLine()])}
        style={{ marginTop: "0.65rem" }}
      >
        + Add item
      </Button>
    </div>
  );
}
