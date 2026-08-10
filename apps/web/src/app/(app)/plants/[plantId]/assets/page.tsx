"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatINR } from "@/lib/format/inr";

type Asset = {
  id: string;
  assetDescription: string;
  vendor: string | null;
  billNumber: string | null;
  billDate: string | null;
  cost: string | number;
  gst: string | number;
  depreciationPercent: string | number;
  createdAt: string;
};

export default function AssetsPage() {
  const params = useParams<{ plantId: string }>();
  const plantId = params.plantId;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [assetDescription, setAssetDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [cost, setCost] = useState("");
  const [gst, setGst] = useState("0");
  const [depreciationPercent, setDepreciationPercent] = useState("0");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plants/${plantId}/assets`);
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        assets?: Asset[];
      };
      if (!res.ok || !data.ok) throw new Error(data.message || "Failed to load");
      setAssets(data.assets ?? []);
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
      const res = await fetch(`/api/plants/${plantId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetDescription,
          vendor: vendor.trim() || null,
          billNumber: billNumber.trim() || null,
          billDate: billDate || null,
          cost: Number(cost),
          gst: Number(gst) || 0,
          depreciationPercent: Number(depreciationPercent) || 0,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message || "Create failed");
      setAssetDescription("");
      setVendor("");
      setBillNumber("");
      setBillDate("");
      setCost("");
      setGst("0");
      setDepreciationPercent("0");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Fixed assets</h1>
      <p className="page-sub">Register plant assets and depreciation.</p>
      {error ? <div className="alert alert--error">{error}</div> : null}

      <form className="form-card form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="desc">Description</label>
          <input
            id="desc"
            required
            value={assetDescription}
            onChange={(e) => setAssetDescription(e.target.value)}
          />
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="vendor">Vendor</label>
            <input
              id="vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="billNumber">Bill number</label>
            <input
              id="billNumber"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="billDate">Bill date</label>
            <input
              id="billDate"
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cost">Cost</label>
            <input
              id="cost"
              type="number"
              step="0.01"
              required
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="gst">GST</label>
            <input
              id="gst"
              type="number"
              step="0.01"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="dep">Depreciation %</label>
            <input
              id="dep"
              type="number"
              step="0.01"
              value={depreciationPercent}
              onChange={(e) => setDepreciationPercent(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Add asset"}
        </button>
      </form>

      <div className="table-wrap" style={{ marginTop: "1.25rem" }}>
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Vendor</th>
              <th>Cost</th>
              <th>Dep %</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="empty">
                  Loading…
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  No assets yet.
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id}>
                  <td>{a.assetDescription}</td>
                  <td>{a.vendor ?? "—"}</td>
                  <td>{formatINR(a.cost)}</td>
                  <td>{Number(a.depreciationPercent)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
