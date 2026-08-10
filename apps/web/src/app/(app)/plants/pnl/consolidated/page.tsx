import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format/inr";
import {
  calculatePlantPnl,
  type PlantPnlResult,
} from "@/lib/pnl/calculate";
import { canViewPnl, getAccessiblePlantIds } from "@/lib/rbac";
import { startOfUtcDay } from "@/lib/dates";

function emptyPnl(): PlantPnlResult {
  return {
    salesRevenue: 0,
    cogs: 0,
    manpower: 0,
    electricity: 0,
    rent: 0,
    pettyCash: 0,
    depreciation: 0,
    grossProfit: 0,
    netProfit: 0,
  };
}

function addPnl(a: PlantPnlResult, b: PlantPnlResult): PlantPnlResult {
  return {
    salesRevenue: a.salesRevenue + b.salesRevenue,
    cogs: a.cogs + b.cogs,
    manpower: a.manpower + b.manpower,
    electricity: a.electricity + b.electricity,
    rent: a.rent + b.rent,
    pettyCash: a.pettyCash + b.pettyCash,
    depreciation: a.depreciation + b.depreciation,
    grossProfit: a.grossProfit + b.grossProfit,
    netProfit: a.netProfit + b.netProfit,
  };
}

function monthBounds(now = new Date()) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = startOfUtcDay(now);
  return { from, to };
}

export default async function ConsolidatedPnlPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canViewPnl(session.user.globalRole)) {
    return (
      <div>
        <h1 className="page-title">Access denied</h1>
        <p className="page-sub">You cannot view consolidated P&amp;L.</p>
      </div>
    );
  }

  const params = await searchParams;
  const defaults = monthBounds();
  const from = params.from ? startOfUtcDay(new Date(params.from)) : defaults.from;
  const to = params.to ? startOfUtcDay(new Date(params.to)) : defaults.to;

  const plantIds = await getAccessiblePlantIds(session.user.id);
  const plants = await prisma.plant.findMany({
    where: { id: { in: plantIds }, isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const perPlant: { plant: (typeof plants)[number]; pnl: PlantPnlResult }[] = [];
  let totals = emptyPnl();

  for (const plant of plants) {
    const pnl = await calculatePlantPnl(plant.id, from, to);
    perPlant.push({ plant, pnl });
    totals = addPnl(totals, pnl);
  }

  const rows: { label: string; value: number; total?: boolean }[] = [
    { label: "Sales revenue", value: totals.salesRevenue },
    { label: "COGS", value: totals.cogs },
    { label: "Gross profit", value: totals.grossProfit },
    { label: "Manpower", value: totals.manpower },
    { label: "Electricity", value: totals.electricity },
    { label: "Rent", value: totals.rent },
    { label: "Petty cash", value: totals.pettyCash },
    { label: "Depreciation", value: totals.depreciation },
    { label: "Net profit", value: totals.netProfit, total: true },
  ];

  return (
    <div>
      <h1 className="page-title">Consolidated P&amp;L</h1>
      <p className="page-sub">
        Sum across {plants.length} accessible plant
        {plants.length === 1 ? "" : "s"} · {from.toISOString().slice(0, 10)} →{" "}
        {to.toISOString().slice(0, 10)}
      </p>

      <form className="form-card form-grid" method="get" style={{ marginBottom: "1rem" }}>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="from">From</label>
            <input
              id="from"
              type="date"
              name="from"
              defaultValue={from.toISOString().slice(0, 10)}
            />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input
              id="to"
              type="date"
              name="to"
              defaultValue={to.toISOString().slice(0, 10)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          Apply
        </button>
      </form>

      <div className="pnl-rows" style={{ marginBottom: "1.25rem" }}>
        {rows.map((r) => (
          <div
            key={r.label}
            className={`pnl-row${r.total ? " pnl-row--total" : ""}`}
          >
            <span>{r.label}</span>
            <span className={r.value < 0 ? "neg" : r.value > 0 ? "pos" : undefined}>
              {formatINR(r.value)}
            </span>
          </div>
        ))}
      </div>

      <h2 className="page-title" style={{ fontSize: "1.2rem" }}>
        By plant
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Plant</th>
              <th>Sales</th>
              <th>Gross</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {perPlant.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  No accessible plants.
                </td>
              </tr>
            ) : (
              perPlant.map(({ plant, pnl }) => (
                <tr key={plant.id}>
                  <td>
                    {plant.name} ({plant.code})
                  </td>
                  <td>{formatINR(pnl.salesRevenue)}</td>
                  <td>{formatINR(pnl.grossProfit)}</td>
                  <td>{formatINR(pnl.netProfit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
