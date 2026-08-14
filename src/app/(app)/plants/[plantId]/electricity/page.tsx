"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatINR } from "@/lib/format/inr";

type Row = {
  id: string;
  month: string;
  openingReading: string | number | null;
  closingReading: string | number | null;
  consumedUnits: string | number | null;
  billAmount: string | number;
  rentAmount: string | number;
  notes: string | null;
};

export default function ElectricityPage() {
  const params = useParams<{ plantId: string }>();
  const plantId = params.plantId;

  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [openingReading, setOpeningReading] = useState("");
  const [closingReading, setClosingReading] = useState("");
  const [consumedUnits, setConsumedUnits] = useState("");
  const [billAmount, setBillAmount] = useState("0");
  const [rentAmount, setRentAmount] = useState("0");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plants/${plantId}/electricity`);
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        rows?: Row[];
      };
      if (!res.ok || !data.ok) throw new Error(data.message || "Failed to load");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/plants/${plantId}/electricity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          openingReading: openingReading === "" ? null : Number(openingReading),
          closingReading: closingReading === "" ? null : Number(closingReading),
          consumedUnits: consumedUnits === "" ? null : Number(consumedUnits),
          billAmount: Number(billAmount) || 0,
          rentAmount: Number(rentAmount) || 0,
          notes: notes.trim() || null,
        }),
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

  return (
    <div>
      <h1 className="page-title">Electricity &amp; rent</h1>
      <p className="page-sub">Monthly bill and rent for this plant.</p>
      {error ? <div className="alert alert--error">{error}</div> : null}

      <form className="form-card form-grid" onSubmit={onSubmit}>
        <div className="form-grid two">
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
            <label htmlFor="bill">Bill amount</label>
            <input
              id="bill"
              type="number"
              step="0.01"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
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
        </div>
        <div className="field">
          <label htmlFor="notes">Notes</label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save month"}
        </button>
      </form>

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
            {loading ? (
              <tr>
                <td colSpan={4} className="empty">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
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
    </div>
  );
}
