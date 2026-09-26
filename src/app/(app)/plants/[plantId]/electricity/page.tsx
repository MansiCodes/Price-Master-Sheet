"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FormPageLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import { ElectricityForms } from "./_helpers/ElectricityForms";
import { ElectricityTables } from "./_helpers/ElectricityTables";
import type { ElectricityRow } from "./_helpers/types";

export default function ElectricityPage() {
  const params = useParams<{ plantId: string }>();
  const plantId = params.plantId;

  const [rows, setRows] = useState<ElectricityRow[]>([]);
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
        rows?: ElectricityRow[];
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
      <ElectricityForms
        isPvc={isPvc}
        month={month}
        setMonth={setMonth}
        coveredArea={coveredArea}
        setCoveredArea={setCoveredArea}
        rentRate={rentRate}
        setRentRate={setRentRate}
        rentExp={rentExp}
        rentAmount={rentAmount}
        setRentAmount={setRentAmount}
        openingReading={openingReading}
        setOpeningReading={setOpeningReading}
        closingReading={closingReading}
        setClosingReading={setClosingReading}
        consumedUnits={consumedUnits}
        setConsumedUnits={setConsumedUnits}
        billAmount={billAmount}
        setBillAmount={setBillAmount}
        notes={notes}
        setNotes={setNotes}
        saving={saving}
        onSubmitRent={onSubmitRent}
        onSubmitElectricity={onSubmitElectricity}
      />
      <ElectricityTables
        isPvc={isPvc}
        rows={rows}
        registerRows={registerRows}
      />
      </>
      ) : null}
    </div>
  );
}
