import { EntryEditDrawer } from "@/components/pnl/EntryEditDrawer";
import {
  electricityUnitsKwh,
  isElectricityExpenseHead,
} from "@/lib/electricity-readings";
import { postJson } from "@/lib/client-forms";

type CrudLike = {
  editing: unknown;
  values: Record<string, string>;
  saving: boolean;
  error: string | null;
  photoUrls: string[];
  setField: (name: string, value: string) => void;
  patchValues: (next: Record<string, string>) => void;
  setPhotoUrls: (urls: string[]) => void;
  closeEdit: () => void;
  save: (payload: Record<string, unknown>) => void;
};

export function buildExpenseEditFields(opts: {
  cat6: boolean;
  editingElectricity: boolean;
  isPettyCategory: boolean;
  t: (key: string) => string;
}) {
  const { cat6, editingElectricity, isPettyCategory, t } = opts;
  const base: Array<{
    name: string;
    label: string;
    type?: "text" | "number" | "date" | "month" | "textarea";
    required?: boolean;
    readOnly?: boolean;
  }> = [];

  if (editingElectricity) {
    return [
      {
        name: "expenseHead",
        label: t("category"),
        required: true,
        readOnly: true,
      },
      {
        name: "month",
        label: "Month",
        type: "month" as const,
        required: true,
      },
      {
        name: "openingReading",
        label: "Opening reading",
        type: "number" as const,
      },
      {
        name: "closingReading",
        label: "Closing reading",
        type: "number" as const,
      },
      {
        name: "rate",
        label: "Rate (₹/unit)",
        type: "number" as const,
      },
      {
        name: "amount",
        label: "Electricity bill Amt",
        type: "number" as const,
        readOnly: true,
      },
      {
        name: "description",
        label: t("remarksNotes"),
        type: "textarea" as const,
      },
    ];
  }

  base.push(
    {
      name: "date",
      label: cat6 ? "Months" : t("date"),
      type: "date",
      required: true,
    },
    { name: "expenseHead", label: t("category"), required: true },
    {
      name: "description",
      label: cat6 ? "Remarks" : t("remarksNotes"),
      type: "textarea",
    },
  );

  if (isPettyCategory) {
    base.push(
      { name: "payMode", label: "Pay Mode" },
      { name: "nature", label: "Nature" },
      { name: "location", label: "Location" },
      { name: "billNumber", label: "Bill Number" },
      {
        name: "contractorSalary",
        label: "Contractor Salary",
        type: "number",
      },
      {
        name: "supervisorSalary",
        label: "Supervisor Salary",
        type: "number",
      },
      {
        name: "amount",
        label: "Petty Cash Amount",
        type: "number",
        required: true,
      },
    );
  } else {
    base.push({
      name: "amount",
      label: cat6 ? "Salary Amt" : t("amount"),
      type: "number",
      required: true,
    });
    if (!cat6) {
      base.push(
        { name: "payMode", label: "Pay Mode" },
        { name: "nature", label: "Nature" },
        { name: "location", label: "Location" },
        { name: "billNumber", label: "Bill Number" },
      );
    }
  }

  return base;
}

export function ExpenseEditDrawer({
  crud,
  plantId,
  editingElectricity,
  isPettyCategory,
  fields,
}: {
  crud: CrudLike;
  plantId: string;
  editingElectricity: boolean;
  isPettyCategory: boolean;
  fields: ReturnType<typeof buildExpenseEditFields>;
}) {
  return (
    <EntryEditDrawer
      open={Boolean(crud.editing)}
      title={editingElectricity ? "Edit electricity" : "Edit expense"}
      fields={fields}
      values={crud.values}
      saving={crud.saving}
      error={crud.error}
      onChange={(name, value) => {
        if (
          editingElectricity &&
          (name === "openingReading" ||
            name === "closingReading" ||
            name === "rate")
        ) {
          const next = { ...crud.values, [name]: value };
          const units = electricityUnitsKwh(
            next.openingReading,
            next.closingReading,
          );
          const rate = Number(next.rate) || 0;
          const amount =
            units != null && rate > 0
              ? String(Math.round(units * rate * 100) / 100)
              : next.amount;
          crud.patchValues({
            [name]: value,
            amount,
          });
          return;
        }
        crud.setField(name, value);
      }}
      onClose={crud.closeEdit}
      upload={{
        urls: crud.photoUrls,
        onChange: crud.setPhotoUrls,
        label: "Upload bill/document (optional)",
      }}
      onSave={() => saveExpenseEdit(crud, plantId, isPettyCategory)}
    />
  );
}

function saveExpenseEdit(
  crud: CrudLike,
  plantId: string,
  isPettyCategory: boolean,
) {
  const head = (crud.values.expenseHead || "").trim();
  const isElec = isElectricityExpenseHead(head);
  const month =
    crud.values.month?.trim() ||
    (crud.values.date || "").slice(0, 7);
  const dayPart = (crud.values.date || "").slice(8, 10) || "01";
  const date = isElec && month ? `${month}-${dayPart}` : crud.values.date;
  const opening = crud.values.openingReading
    ? Number(crud.values.openingReading)
    : null;
  const closing = crud.values.closingReading
    ? Number(crud.values.closingReading)
    : null;
  const rate = Number(crud.values.rate) || 0;
  const units = electricityUnitsKwh(opening, closing);
  const amount =
    isElec && units != null && rate > 0
      ? Math.round(units * rate * 100) / 100
      : Number(crud.values.amount || 0);
  const isWageHead =
    head === "Contractor Wages" || head === "Labour Contractor";
  const isSalaryHead = head === "Salary Expenses";
  const contractorSalary = isPettyCategory
    ? Number(crud.values.contractorSalary || 0)
    : isWageHead || isSalaryHead
      ? 0
      : Number(crud.values.contractorSalary || 0);
  const supervisorSalary = isPettyCategory
    ? Number(crud.values.supervisorSalary || 0)
    : isWageHead || isSalaryHead
      ? 0
      : Number(crud.values.supervisorSalary || 0);

  void (async () => {
    if (isElec && month) {
      await postJson(`/api/plants/${plantId}/electricity`, {
        month,
        openingReading: opening,
        closingReading: closing,
        consumedUnits: units,
        billAmount: amount,
        notes: crud.values.description || null,
        dailyDate: date,
        shift: crud.values.shift || "DAY",
        expenseHead: head,
        payMode: crud.values.payMode || "Cash",
      });
    }
    void crud.save({
      date,
      expenseHead: crud.values.expenseHead,
      description: crud.values.description || null,
      amount,
      payMode: crud.values.payMode || undefined,
      nature: isElec ? null : crud.values.nature || null,
      location: isElec ? null : crud.values.location || null,
      billNumber: isElec ? null : crud.values.billNumber || null,
      contractorSalary,
      supervisorSalary,
      openingReading: opening,
      closingReading: closing,
      billPhotoUrls: crud.photoUrls,
    });
  })();
}
