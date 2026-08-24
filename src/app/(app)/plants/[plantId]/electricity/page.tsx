"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { formatINR } from "@/lib/format/inr";
import { formatMonthLabel } from "@/lib/dates";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { FormPageLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";

type Row = {
  id: string;
  month: string;
  openingReading: string | number | null;
  closingReading: string | number | null;
  consumedUnits: string | number | null;
  billAmount: string | number;
  rentAmount: string | number;
  coveredAreaSqft?: string | number | null;
  rentRatePerSqft?: string | number | null;
  notes: string | null;
};

export default function ElectricityPage() {
  const params = useParams<{ plantId: string }>();
  const plantId = params.plantId;

  const [rows, setRows] = useState<Row[]>([]);
  const [plantCode, setPlantCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [openingReading, setOpeningReading] = useState("");
  const [closingReading, setClosingReading] = useState("");
  const [consumedUnits, setConsumedUnits] = useState("");
  const [billAmount, setBillAmount] = useState("0");
  const [coveredArea, setCoveredArea] = useState("");
  const [rentRate, setRentRate] = useState("12");
  const [rentAmount, setRentAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const isPvc = plantCode?.toUpperCase() === "PVC";
  const registerRows = useMemo(
    () =>
      [...rows].sort((a, b) => String(a.month).localeCompare(String(b.month))),
    [rows],
  );
  const rentExp = useMemo(() => {
    const area = Number(coveredArea);
    const rate = Number(rentRate);
    if (Number.isFinite(area) && Number.isFinite(rate)) {
      return (area * rate).toFixed(2);
    }
    return rentAmount;
  }, [coveredArea, rentRate, rentAmount]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plants/${plantId}/electricity`);
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        plantCode?: string | null;
        rows?: Row[];
      };
      if (!res.ok || !data.ok) throw new Error(data.message || "Failed to load");
      setPlantCode(data.plantCode ?? null);
      setRows(data.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (plantId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId]);

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/plants/${plantId}/electricity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, ...payload }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message || "Save failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitRent(e: FormEvent) {
    e.preventDefault();
    const area = coveredArea === "" ? null : Number(coveredArea);
    const rate = rentRate === "" ? null : Number(rentRate);
    await save({
      coveredAreaSqft: area,
      rentRatePerSqft: rate,
      rentAmount: Number(rentExp) || 0,
    });
  }

  async function onSubmitElectricity(e: FormEvent) {
    e.preventDefault();
    await save({
      openingReading: openingReading === "" ? null : Number(openingReading),
      closingReading: closingReading === "" ? null : Number(closingReading),
      consumedUnits: consumedUnits === "" ? null : Number(consumedUnits),
      billAmount: Number(billAmount) || 0,
      notes: notes.trim() || null,
      ...(isPvc
        ? {}
        : {
            rentAmount: Number(rentAmount) || 0,
          }),
    });
  }

  return (
    <div>
      <h1 className="page-title">
        {isPvc ? "Electricity & Factory Rent" : "Electricity & rent"}
      </h1>
      <p className="page-sub">
        {isPvc
          ? "PVC Plant closing rent uses Covered Area × Rate. Electricity bill is entered separately for the same month."
          : "Monthly bill and rent for this plant."}
      </p>
      {error ? <div className="alert alert--error">{error}</div> : null}

      {loading && rows.length === 0 ? (
        <FormPageLoadingSkeleton label="Loading electricity" showChrome={false} />
      ) : null}

      {!(loading && rows.length === 0) ? (
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

      {isPvc ? (
        <>
          <h2 className="page-title" style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
            Factory Rent
          </h2>
          <div className="table-wrap">
            <table style={{ tableLayout: "fixed", width: "100%" }}>
              <colgroup>
                <col style={{ width: "4.5rem" }} />
                <col style={{ width: "8rem" }} />
                <col />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "10rem" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="is-center">S.No</th>
                  <th>Months</th>
                  <th className="is-right">Covered Area</th>
                  <th className="is-right">Rate</th>
                  <th className="is-right">Rent Exp</th>
                </tr>
              </thead>
              <tbody>
                {registerRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      No rows yet.
                    </td>
                  </tr>
                ) : (
                  registerRows.map((r, i) => (
                    <tr key={`rent-${r.id}`}>
                      <td className="is-center">{i + 1}</td>
                      <td>{formatMonthLabel(r.month)}</td>
                      <td className="is-right">
                        {r.coveredAreaSqft == null
                          ? "—"
                          : `${Number(r.coveredAreaSqft).toLocaleString("en-IN")} SQFT`}
                      </td>
                      <td className="is-right">
                        {r.rentRatePerSqft == null
                          ? "—"
                          : Number(r.rentRatePerSqft).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </td>
                      <td className="is-right">
                        {Number(r.rentAmount) > 0
                          ? formatINR(r.rentAmount)
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="page-title" style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
            Electricity & Power Expense
          </h2>
          <div className="table-wrap">
            <table style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th className="is-center">S No.</th>
                  <th>Months</th>
                  <th className="is-right">Opening Reading</th>
                  <th className="is-right">Closing Reading</th>
                  <th className="is-right">Consumed Reading</th>
                  <th className="is-right">Amount of electricity bill</th>
                </tr>
              </thead>
              <tbody>
                {registerRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      No rows yet.
                    </td>
                  </tr>
                ) : (
                  registerRows.map((r, i) => (
                    <tr key={`elec-${r.id}`}>
                      <td className="is-center">{i + 1}</td>
                      <td>{formatMonthLabel(r.month)}</td>
                      <td className="is-right">
                        {r.openingReading == null
                          ? "—"
                          : Number(r.openingReading).toLocaleString("en-IN")}
                      </td>
                      <td className="is-right">
                        {r.closingReading == null
                          ? "—"
                          : Number(r.closingReading).toLocaleString("en-IN")}
                      </td>
                      <td className="is-right">
                        {r.consumedUnits == null
                          ? "—"
                          : Number(r.consumedUnits).toLocaleString("en-IN")}
                      </td>
                      <td className="is-right">
                        {Number(r.billAmount) > 0
                          ? formatINR(r.billAmount)
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="table-wrap" style={{ marginTop: "1.25rem" }}>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Units</th>
                <th>Bill</th>
                <th>Rent</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    No rows yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{String(r.month).slice(0, 7)}</td>
                    <td>{r.consumedUnits ?? "—"}</td>
                    <td>{formatINR(r.billAmount)}</td>
                    <td>{formatINR(r.rentAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      </>
      ) : null}
    </div>
  );
}
