import { FormEvent } from "react";
import { formatINR } from "@/lib/format/inr";
import { DecimalInput } from "@/components/ui/DecimalInput";

export function ElectricityForms({
  isPvc,
  month,
  setMonth,
  coveredArea,
  setCoveredArea,
  rentRate,
  setRentRate,
  rentExp,
  rentAmount,
  setRentAmount,
  openingReading,
  setOpeningReading,
  closingReading,
  setClosingReading,
  consumedUnits,
  setConsumedUnits,
  billAmount,
  setBillAmount,
  notes,
  setNotes,
  saving,
  onSubmitRent,
  onSubmitElectricity,
}: {
  isPvc: boolean;
  month: string;
  setMonth: (value: string) => void;
  coveredArea: string;
  setCoveredArea: (value: string) => void;
  rentRate: string;
  setRentRate: (value: string) => void;
  rentExp: string;
  rentAmount: string;
  setRentAmount: (value: string) => void;
  openingReading: string;
  setOpeningReading: (value: string) => void;
  closingReading: string;
  setClosingReading: (value: string) => void;
  consumedUnits: string;
  setConsumedUnits: (value: string) => void;
  billAmount: string;
  setBillAmount: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  saving: boolean;
  onSubmitRent: (e: FormEvent) => void;
  onSubmitElectricity: (e: FormEvent) => void;
}) {
  return (
    <>
      {isPvc ? (
        <form className="form-card form-grid" onSubmit={onSubmitRent}>
          <h2 className="page-title" style={{ fontSize: "1.05rem" }}>
            Factory Rent
          </h2>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="month">Months</label>
              <input
                id="month"
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="covered-area">Covered Area</label>
              <DecimalInput
                id="covered-area"
                value={coveredArea}
                onChange={setCoveredArea}
                placeholder="SQFT"
              />
            </div>
            <div className="field">
              <label htmlFor="rent-rate">Rate</label>
              <DecimalInput
                id="rent-rate"
                value={rentRate}
                onChange={setRentRate}
              />
            </div>
            <div className="field">
              <label htmlFor="rent">Rent Exp</label>
              <input id="rent" value={formatINR(Number(rentExp) || 0)} readOnly />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save rent"}
          </button>
        </form>
      ) : null}

      <form
        className="form-card form-grid"
        onSubmit={onSubmitElectricity}
        style={isPvc ? { marginTop: "1.25rem" } : undefined}
      >
        {isPvc ? (
          <h2 className="page-title" style={{ fontSize: "1.05rem" }}>
            Electricity & Power Expense
          </h2>
        ) : null}
        <div className="form-grid two">
          {isPvc ? null : (
            <>
              <div className="field">
                <label htmlFor="month">Month</label>
                <input
                  id="month"
                  type="month"
                  required
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="rent">Rent amount</label>
                <input
                  id="rent"
                  type="number"
                  step="0.01"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="opening">Opening reading</label>
            <input
              id="opening"
              type="number"
              step="any"
              value={openingReading}
              onChange={(e) => setOpeningReading(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="closing">Closing reading</label>
            <input
              id="closing"
              type="number"
              step="any"
              value={closingReading}
              onChange={(e) => setClosingReading(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="consumed">Consumed units</label>
            <input
              id="consumed"
              type="number"
              step="any"
              value={consumedUnits}
              onChange={(e) => setConsumedUnits(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="bill">Bill amount</label>
            <input
              id="bill"
              type="number"
              step="0.01"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">Notes / Remark</label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : isPvc ? "Save electricity" : "Save month"}
        </button>
      </form>
    </>
  );
}
