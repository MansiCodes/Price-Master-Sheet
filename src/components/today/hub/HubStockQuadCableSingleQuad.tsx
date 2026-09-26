import { getQuadSignalCableSizes } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadSingleQuadExtras } from "@/components/today/hub/HubStockQuadSingleQuadExtras";
import { HubStockQuadCableSingleQuadPrimaryRow } from "@/components/today/hub/HubStockQuadCableSingleQuadPrimaryRow";

function addSingleQuadExtraRow(
  setStockSingleQuadExtras: ReturnType<typeof bindStockLocals>["setStockSingleQuadExtras"],
  resolvedQuadSizeName: string,
) {
  setStockSingleQuadExtras((prev) => {
    const size =
      getQuadSignalCableSizes("Quad Cable").find(
        (s) => s !== "Other" && s !== resolvedQuadSizeName && !prev.some((p) => p.size === s),
      ) ?? "Other";
    return [...prev, { id: `sq-extra-${Date.now()}-${prev.length}`, size, sizeOther: "", singleQuadProd: "", layingProduced: "" }];
  });
}

function HubStockQuadCableSingleQuadHead({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="qs-wip__box-head">
      <h4 className="qs-wip__box-title">Single Quad</h4>
      <button
        type="button"
        className="qs-wip__ins-add"
        aria-label="Add size for Single Quad"
        title="Add size"
        onClick={onAdd}
      >
        +
      </button>
    </div>
  );
}

function HubStockQuadCableSingleQuadThead() {
  return (
    <thead>
      <tr>
        <th>Size</th>
        <th>Opening</th>
        <th>Single Quad Prod</th>
        <th>Laying</th>
        <th>
          Out
          <span style={{ display: "block", fontSize: "10px", fontWeight: "normal" }}>
            (Laying × Factor)
          </span>
        </th>
        <th>Closing</th>
        <th style={{ width: "32px" }}></th>
      </tr>
    </thead>
  );
}

function HubStockQuadCableSingleQuadFoot({
  stockWipCalc,
  singleQuadStage,
  totalSingleQuadProd,
  totalLayingProduced,
}: {
  stockWipCalc: unknown;
  singleQuadStage?: { outbound: number; closing: number; opening: number };
  totalSingleQuadProd: number;
  totalLayingProduced: number;
}) {
  if (stockWipCalc == null || singleQuadStage == null) return null;
  return (
    <div className="qs-wip__ins-extras-foot" style={{ marginTop: "10px" }}>
      Total Single Quad Prod:{" "}
      <span className="qs-wip__calc">{totalSingleQuadProd} km</span>
      {" "}· Total Laying Produced:{" "}
      <span className="qs-wip__calc">{totalLayingProduced} km</span>
      {" "}· Total Single Quad Out:{" "}
      <span className="qs-wip__calc">{singleQuadStage.outbound} km</span>
      {" "}· Closing:{" "}
      <span className="qs-wip__calc">{singleQuadStage.closing} km</span>
    </div>
  );
}

type SingleQuadTableProps = {
  vm: TodayHubVm;
  primaryQuadFactor: number;
  primaryRowOutbound: number;
  singleQuadStage?: { outbound: number; closing: number; opening: number };
};

function HubStockQuadCableSingleQuadTable(props: SingleQuadTableProps) {
  const s = bindStockLocals(props.vm);
  const singleQuadSizeOpts = [...getQuadSignalCableSizes("Quad Cable")];
  return (
    <div className="qs-wip__table-wrap">
      <table className="qs-wip__table">
        <HubStockQuadCableSingleQuadThead />
        <tbody>
          <HubStockQuadCableSingleQuadPrimaryRow
            vm={props.vm}
            primaryQuadFactor={props.primaryQuadFactor}
            primaryRowOutbound={props.primaryRowOutbound}
            singleQuadStage={props.singleQuadStage}
          />
          <HubStockQuadSingleQuadExtras
            extras={s.stockSingleQuadExtras}
            sizeOpts={singleQuadSizeOpts}
            onChange={s.setStockSingleQuadExtras}
          />
        </tbody>
      </table>
    </div>
  );
}

type HubStockQuadCableSingleQuadProps = {
  vm: TodayHubVm;
  singleQuadStage?: { outbound: number; closing: number; opening: number };
  primaryQuadFactor: number;
  primaryLaying: number;
  primaryRowOutbound: number;
  totalSingleQuadProd: number;
  totalLayingProduced: number;
};

export function HubStockQuadCableSingleQuad(p: HubStockQuadCableSingleQuadProps) {
  const s = bindStockLocals(p.vm);
  return (
    <>
      {/* Box 2: Single Quad */}
      <div className="qs-wip__box">
        <HubStockQuadCableSingleQuadHead
          onAdd={() => addSingleQuadExtraRow(s.setStockSingleQuadExtras, s.resolvedQuadSizeName)}
        />
        <HubStockQuadCableSingleQuadTable
          vm={p.vm}
          primaryQuadFactor={p.primaryQuadFactor}
          primaryRowOutbound={p.primaryRowOutbound}
          singleQuadStage={p.singleQuadStage}
        />
        <HubStockQuadCableSingleQuadFoot
          stockWipCalc={s.stockWipCalc}
          singleQuadStage={p.singleQuadStage}
          totalSingleQuadProd={p.totalSingleQuadProd}
          totalLayingProduced={p.totalLayingProduced}
        />
      </div>
    </>
  );
}
