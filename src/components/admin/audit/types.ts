export const AUDIT_PAGE_SIZE = 10;

export type AuditRow = {
  id: string;
  createdAt: string;
  dateKey: string;
  entityType: string;
  entityId: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  isBackdated: boolean;
  actorName: string;
  actorEmail: string;
};

const SKIP_KEY =
  /^(id|plantId|enteredById|actorId|userId|accountantId|passwordHash|password|billPhotoUrl|billPhotoUrls|createdAt|updatedAt|completedAt|isBackdated|isActive|canViewPriceSheet|plantIds|passwordChanged)$/i;

const ENTITY_LABEL: Record<string, string> = {
  Purchase: "Purchase",
  Sale: "Sale",
  User: "User",
  ProductionEntry: "Production",
  ManpowerEntry: "Manpower",
  PettyCashEntry: "Expense",
  StockEntry: "Stock",
  ElectricityBill: "Electricity",
  ElectricityEntry: "Electricity",
  Asset: "Asset",
  Plant: "Plant",
  PlantContact: "Contact",
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BUSINESS_HEAD: "Business Head",
  PLANT_MANAGER: "Plant Manager",
  ACCOUNTANT: "Accountant",
  VIEWER: "Viewer",
};

export function auditEntityLabel(entityType: string): string {
  return ENTITY_LABEL[entityType] ?? entityType.replace(/Entry$/, "");
}

export function auditActionLabel(field: string | null): string {
  if (!field) return "—";
  if (field === "create") return "Created";
  if (field === "update") return "Updated";
  return field;
}

function parseMaybeJson(value: string | null): unknown {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function money(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `₹${n.toLocaleString("en-IN")}`;
}

function niceRole(value: unknown): string {
  const key = String(value ?? "");
  return ROLE_LABEL[key] ?? key.replaceAll("_", " ").toLowerCase();
}

function summarizeObject(obj: Record<string, unknown>): string {
  const parts: string[] = [];

  if (obj.email) parts.push(String(obj.email));
  if (obj.globalRole) parts.push(niceRole(obj.globalRole));
  if (obj.name && !obj.email) parts.push(String(obj.name));
  if (obj.vendorName) parts.push(String(obj.vendorName));
  if (obj.customerName) parts.push(String(obj.customerName));
  if (obj.itemDescription) parts.push(String(obj.itemDescription));
  if (obj.productName) parts.push(String(obj.productName));
  if (obj.expenseHead) parts.push(String(obj.expenseHead));
  if (obj.itemCount != null) parts.push(`${obj.itemCount} item(s)`);
  if (obj.quantity != null) {
    const unit = obj.unit ? ` ${obj.unit}` : "";
    parts.push(`qty ${obj.quantity}${unit}`);
  }
  const manpower = asRecord(obj.manpower);
  if (manpower) {
    parts.push(
      `staff ${Number(manpower.manager) || 0}/${Number(manpower.operator) || 0}/${Number(manpower.helper) || 0}`,
    );
  }
  const amount =
    money(obj.invoiceValue) ??
    money(obj.salesValue) ??
    money(obj.amount) ??
    money(obj.totalCost);
  if (amount) parts.push(amount);
  if (obj.billNumber) parts.push(`bill ${obj.billNumber}`);

  if (parts.length > 0) return parts.join(" · ");

  const fallback = Object.entries(obj)
    .filter(([key, val]) => val != null && val !== "" && !SKIP_KEY.test(key))
    .slice(0, 4)
    .map(([key, val]) => `${key} ${typeof val === "object" ? "" : String(val)}`.trim())
    .filter(Boolean);

  return fallback.join(" · ") || "Record saved";
}

function summarizeValue(raw: string | null): string {
  const parsed = parseMaybeJson(raw);
  if (parsed == null) return "";
  if (typeof parsed === "string") return parsed;
  const obj = asRecord(parsed);
  if (obj) return summarizeObject(obj);
  if (Array.isArray(parsed)) return `${parsed.length} item(s)`;
  return String(parsed);
}

export function formatAuditChange(
  oldValue: string | null,
  newValue: string | null,
): string {
  const next = summarizeValue(newValue);
  const prev = summarizeValue(oldValue);
  if (prev && next && prev !== next) return `${prev} → ${next}`;
  return next || prev || "—";
}
