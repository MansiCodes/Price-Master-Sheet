import { formatINR } from "@/lib/format/inr";
import { EntryEditDrawer } from "@/components/pnl/EntryEditDrawer";
import { num } from "@/components/pnl/purchase-report/format";

type CrudLike = {
  editing: unknown;
  values: Record<string, string>;
  saving: boolean;
  error: string | null;
  photoUrls: string[];
  setField: (name: string, value: string) => void;
  setPhotoUrls: (urls: string[]) => void;
  closeEdit: () => void;
  save: (payload: Record<string, unknown>) => void;
};

export function PurchaseEditDrawer({
  crud,
  cat6,
}: {
  crud: CrudLike;
  cat6: boolean;
}) {
  return (
    <EntryEditDrawer
      open={Boolean(crud.editing)}
      title="Edit purchase"
      fields={
        cat6
          ? [
              { name: "date", label: "Bill Date", type: "date", required: true },
              { name: "gstin", label: "GSTIN/GST No" },
              { name: "vendorName", label: "Vendor's Name", required: true },
              { name: "billNumber", label: "Bill Number" },
              { name: "itemDescription", label: "Item Details", required: true },
              { name: "quantity", label: "Item QTY", type: "number", required: true },
              {
                name: "debitQuantity",
                label: "Debit Qty",
                type: "number",
              },
              { name: "unit", label: "Unit", required: true },
              { name: "rate", label: "Rate", type: "number", required: false },
              { name: "notes", label: "Notes", type: "textarea" },
            ]
          : [
              { name: "date", label: "Bill date", type: "date", required: true },
              { name: "vendorName", label: "Supplier name", required: true },
              { name: "billNumber", label: "Invoice no. / Challan no." },
              { name: "itemDescription", label: "Description", required: true },
              { name: "quantity", label: "Qty", type: "number", required: true },
              {
                name: "debitQuantity",
                label: "Debit Qty",
                type: "number",
              },
              { name: "unit", label: "Unit", required: true },
              { name: "rate", label: "Rate", type: "number", required: false },
              { name: "gstPercent", label: "GST %", type: "number" },
              { name: "notes", label: "Remarks", type: "textarea" },
            ]
      }
      values={crud.values}
      saving={crud.saving}
      error={crud.error}
      onChange={crud.setField}
      onClose={crud.closeEdit}
      upload={{
        urls: crud.photoUrls,
        onChange: crud.setPhotoUrls,
        label: "Upload bill/challan (optional)",
      }}
      onSave={() =>
        void crud.save({
          date: crud.values.date,
          billDate: crud.values.date || null,
          booksDate: crud.values.date || null,
          vendorName: crud.values.vendorName,
          billNumber: crud.values.billNumber || null,
          gstin: crud.values.gstin || null,
          itemDescription: crud.values.itemDescription,
          quantity: Number(crud.values.quantity),
          debitQuantity: Number(crud.values.debitQuantity || 0),
          unit: crud.values.unit,
          rate: Number(crud.values.rate),
          gstPercent: Number(crud.values.gstPercent || 0),
          notes: crud.values.notes || null,
          billPhotoUrls: crud.photoUrls,
        })
      }
    >
      <div className="field">
        <label htmlFor="edit-debit-value">Debit Value</label>
        <input
          id="edit-debit-value"
          readOnly
          value={
            num(crud.values.debitQuantity || 0) > 0
              ? formatINR(
                  num(crud.values.debitQuantity || 0) *
                    num(crud.values.rate || 0),
                )
              : "—"
          }
        />
      </div>
      <div className="field">
        <label htmlFor="edit-net-value">Net value (after debit)</label>
        <input
          id="edit-net-value"
          readOnly
          value={formatINR(
            Math.max(
              0,
              num(crud.values.quantity || 0) -
                num(crud.values.debitQuantity || 0),
            ) * num(crud.values.rate || 0),
          )}
        />
      </div>
    </EntryEditDrawer>
  );
}
