import { EntryEditDrawer } from "@/components/pnl/EntryEditDrawer";

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

export function SalesEditDrawer({
  crud,
  cat6,
}: {
  crud: CrudLike;
  cat6: boolean;
}) {
  return (
    <EntryEditDrawer
      open={Boolean(crud.editing)}
      title="Edit sale"
      fields={
        cat6
          ? [
              { name: "date", label: "Bill Date", type: "date", required: true },
              { name: "customerName", label: "Customer Name", required: true },
              { name: "billNumber", label: "Bill Number" },
              { name: "itemDescription", label: "Item Details", required: true },
              { name: "quantity", label: "Quantity", type: "number", required: true },
              { name: "unit", label: "Unit", required: true },
              { name: "rate", label: "Rate", type: "number", required: false },
              { name: "inMeter", label: "In Meter", type: "number" },
              { name: "qtyMtr", label: "QTY-MTR", type: "number" },
              { name: "meterUnit", label: "Unit (MTR)" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]
          : [
              { name: "date", label: "Bill date", type: "date", required: true },
              { name: "customerName", label: "Customer", required: true },
              { name: "billNumber", label: "Invoice no." },
              { name: "itemDescription", label: "Item Details", required: true },
              { name: "quantity", label: "Qty", type: "number", required: true },
              { name: "unit", label: "Unit", required: true },
              { name: "rate", label: "Rate", type: "number", required: false },
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
        label: "Upload invoice (optional)",
      }}
      onSave={() =>
        void crud.save({
          date: crud.values.date,
          billDate: crud.values.date || null,
          customerName: crud.values.customerName,
          billNumber: crud.values.billNumber || null,
          itemDescription: crud.values.itemDescription,
          quantity: Number(crud.values.quantity),
          unit: crud.values.unit,
          rate: Number(crud.values.rate),
          inMeter: crud.values.inMeter ? Number(crud.values.inMeter) : null,
          qtyMtr: crud.values.qtyMtr ? Number(crud.values.qtyMtr) : null,
          meterUnit: crud.values.meterUnit || null,
          notes: crud.values.notes || null,
          billPhotoUrls: crud.photoUrls,
        })
      }
    />
  );
}
