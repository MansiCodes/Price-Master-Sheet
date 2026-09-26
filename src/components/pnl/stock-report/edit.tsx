import { EntryEditDrawer, type EditField } from "@/components/pnl/EntryEditDrawer";
import {
  encodeQuadSignalStockNotes,
  encodeUpcastStockNotes,
  parseQuadSignalStockNotes,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import type { StockRow } from "@/components/pnl/stock-report/types";

type CrudLike = {
  editing: StockRow | null;
  values: Record<string, string>;
  saving: boolean;
  error: string | null;
  photoUrls: string[];
  setField: (name: string, value: string) => void;
  setPhotoUrls: (urls: string[]) => void;
  closeEdit: () => void;
  save: (payload: Record<string, unknown>) => void;
};

export function StockEditDrawer({
  crud,
  isPvc,
  isUpcast,
  isQuadSignal,
  quadKind,
}: {
  crud: CrudLike;
  isPvc: boolean;
  isUpcast: boolean;
  isQuadSignal: boolean;
  quadKind: "raw" | "cable";
}) {
  return (
    <EntryEditDrawer
      open={Boolean(crud.editing)}
      title="Edit stock"
      fields={
        [
          { name: "date", label: "Date", type: "date", required: true },
          ...(isPvc
            ? [
                {
                  name: "category",
                  label: "Stock (RM/FG)",
                  required: true,
                },
              ]
            : []),
          {
            name: "itemName",
            label: isPvc ? "Particulars" : "Item Name",
            required: true,
          },
          ...(isUpcast
            ? [
                { name: "upcastOpening", label: "Opening Stock (kg)", type: "number" },
                { name: "upcastIncoming", label: "Incoming Stock (kg)", type: "number" },
                { name: "upcastOutward", label: "Outward Stock (kg)", type: "number" },
                { name: "upcastTotalScrapWeight", label: "Total Scrap Weight (kg)", type: "number" },
                { name: "upcastPettyQty", label: "Petty Qty", type: "number" },
                { name: "upcastWeightPerPetty", label: "Weight per Petty (kg)", type: "number" },
                { name: "upcastBurningLossWeight", label: "Burning Loss Weight (kg)", type: "number" },
                { name: "upcastRod8mmWeight", label: "8mm Rod Weight (kg)", type: "number" },
                { name: "upcastWire8mmTo1_6mmWeight", label: "8mm to 1.6mm Wire Weight (kg)", type: "number" },
                { name: "upcastWire1_6mmWeight", label: "1.6mm Wire Weight (kg)", type: "number" },
                {
                  name: "quantity",
                  label: "Calculated Closing Stock (kg)",
                  type: "number",
                  readOnly: true,
                },
              ]
            : [
                {
                  name: "quantity",
                  label: isPvc ? "Closing Stock" : "QTY",
                  type: "number",
                  required: true,
                },
              ]),
          { name: "unit", label: "Unit", required: true },
          { name: "rate", label: "Rate", type: "number", required: false },
          ...(isQuadSignal && quadKind === "cable"
            ? [
                { name: "callPutup", label: "Call putup qty" },
                { name: "putupDate", label: "Put up date", type: "date" },
                { name: "partyName", label: "Call putup party" },
                {
                  name: "dispatchPending",
                  label: "Dispatch qty",
                  type: "number",
                },
                { name: "dispatchParty", label: "Dispatch party" },
              ]
            : []),
          { name: "notes", label: "Notes", type: "textarea" },
        ] as EditField[]
      }
      values={
        isUpcast
          ? {
              ...crud.values,
              quantity: String(
                (Number(crud.values.upcastOpening) || 0) +
                  (Number(crud.values.upcastIncoming) || 0) -
                  (Number(crud.values.upcastOutward) || 0)
              ),
            }
          : crud.values
      }
      saving={crud.saving}
      error={crud.error}
      onChange={crud.setField}
      onClose={crud.closeEdit}
      upload={{
        urls: crud.photoUrls,
        onChange: crud.setPhotoUrls,
        label: "Upload stock images (optional)",
      }}
      onSave={() => saveStockEdit(crud, isPvc, isUpcast, isQuadSignal, quadKind)}
    />
  );
}

function saveStockEdit(
  crud: CrudLike,
  isPvc: boolean,
  isUpcast: boolean,
  isQuadSignal: boolean,
  quadKind: "raw" | "cable",
) {
  let qty = Number(crud.values.quantity) || 0;
  let notes: string | null = crud.values.notes || null;

  if (isUpcast) {
    const openingNum = Number(crud.values.upcastOpening) || 0;
    const incomingNum = Number(crud.values.upcastIncoming) || 0;
    const outwardNum = Number(crud.values.upcastOutward) || 0;
    qty = openingNum + incomingNum - outwardNum;

    const totalScrapWeight = crud.values.upcastTotalScrapWeight !== "" && crud.values.upcastTotalScrapWeight != null ? Number(crud.values.upcastTotalScrapWeight) || 0 : undefined;
    const pettyQty = crud.values.upcastPettyQty !== "" && crud.values.upcastPettyQty != null ? Number(crud.values.upcastPettyQty) || 0 : undefined;
    const weightPerPetty = crud.values.upcastWeightPerPetty !== "" && crud.values.upcastWeightPerPetty != null ? Number(crud.values.upcastWeightPerPetty) || 0 : undefined;
    const totalPettyWeight = pettyQty != null && weightPerPetty != null ? pettyQty * weightPerPetty : undefined;
    const sortingLossWeight = totalScrapWeight != null && totalPettyWeight != null ? totalScrapWeight - totalPettyWeight : undefined;

    const burningLossWeight = crud.values.upcastBurningLossWeight !== "" && crud.values.upcastBurningLossWeight != null ? Number(crud.values.upcastBurningLossWeight) || 0 : undefined;
    const weightAfterBurning = totalPettyWeight != null && burningLossWeight != null ? totalPettyWeight - burningLossWeight : undefined;

    const rod8mmWeight = crud.values.upcastRod8mmWeight !== "" && crud.values.upcastRod8mmWeight != null ? Number(crud.values.upcastRod8mmWeight) || 0 : undefined;
    const wire8mmTo1_6mmWeight = crud.values.upcastWire8mmTo1_6mmWeight !== "" && crud.values.upcastWire8mmTo1_6mmWeight != null ? Number(crud.values.upcastWire8mmTo1_6mmWeight) || 0 : undefined;
    const wire1_6mmWeight = crud.values.upcastWire1_6mmWeight !== "" && crud.values.upcastWire1_6mmWeight != null ? Number(crud.values.upcastWire1_6mmWeight) || 0 : undefined;

    let totalOutputWeight: number | undefined = undefined;
    if (rod8mmWeight != null || wire8mmTo1_6mmWeight != null || wire1_6mmWeight != null) {
      totalOutputWeight = (rod8mmWeight || 0) + (wire8mmTo1_6mmWeight || 0) + (wire1_6mmWeight || 0);
    }
    const castingLossWeight = weightAfterBurning != null && totalOutputWeight != null ? weightAfterBurning - totalOutputWeight : undefined;

    notes = encodeUpcastStockNotes(
      {
        opening: openingNum,
        incoming: incomingNum,
        outward: outwardNum,
        closing: qty,
        totalScrapWeight,
        pettyQty,
        weightPerPetty,
        totalPettyWeight,
        sortingLossWeight,
        burningLossWeight,
        weightAfterBurning,
        rod8mmWeight,
        wire8mmTo1_6mmWeight,
        wire1_6mmWeight,
        totalOutputWeight,
        castingLossWeight,
      },
      crud.values.notes?.trim() || null
    );
  } else if (isQuadSignal && quadKind === "cable" && crud.editing) {
    const { meta } = parseQuadSignalStockNotes(crud.editing.notes);
    if (meta?.kind === "cable") {
      const nextMeta: QuadSignalStockMeta = { ...meta };
      const callPutup = crud.values.callPutup?.trim() ?? "";
      const putupDate = crud.values.putupDate?.trim() ?? "";
      const partyName = crud.values.partyName?.trim() ?? "";
      const dispatchParty = crud.values.dispatchParty?.trim() ?? "";
      const dispatchRaw = crud.values.dispatchPending?.trim() ?? "";
      if (callPutup) nextMeta.callPutup = callPutup;
      else delete nextMeta.callPutup;
      if (putupDate) nextMeta.putupDate = putupDate;
      else delete nextMeta.putupDate;
      if (partyName) nextMeta.partyName = partyName;
      else delete nextMeta.partyName;
      if (dispatchParty) nextMeta.dispatchParty = dispatchParty;
      else delete nextMeta.dispatchParty;
      if (dispatchRaw !== "") {
        const n = Number(dispatchRaw);
        if (Number.isFinite(n) && n >= 0) nextMeta.dispatchPending = n;
        else delete nextMeta.dispatchPending;
      } else {
        delete nextMeta.dispatchPending;
      }
      notes = encodeQuadSignalStockNotes(
        nextMeta,
        crud.values.notes?.trim() || null,
      );
    }
  }

  const rate = Number(crud.values.rate) || 0;
  void crud.save({
    date: crud.values.date,
    ...(isPvc ? { category: crud.values.category || null } : {}),
    itemName: crud.values.itemName,
    quantity: qty,
    unit: crud.values.unit,
    rate: rate,
    value: qty * rate,
    notes,
    photoUrls: crud.photoUrls,
  });
}
