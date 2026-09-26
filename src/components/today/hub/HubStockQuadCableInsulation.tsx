import { getQuadSignalCableSizes } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadProcessRow } from "@/components/today/hub/HubStockQuadProcessRow";
import { HubStockQuadCableInsulationExtraRow } from "@/components/today/hub/HubStockQuadCableInsulationExtraRow";
import type { SetStockInsulationExtras } from "@/components/today/hub/patch-insulation-extra";

function addQuadCableInsulationExtra(
  setStockInsulationExtras: SetStockInsulationExtras,
  resolvedQuadSizeName: string,
) {
  setStockInsulationExtras((prev) => {
    const size =
      getQuadSignalCableSizes("Quad Cable").find(
        (s) => s !== "Other" && s !== resolvedQuadSizeName && !prev.some((p) => p.size === s),
      ) ?? "Other";
    return [...prev, { id: `ins-extra-${Date.now()}-${prev.length}`, size, sizeOther: "", lengthValue: "", lengthUnit: "km" as const, lengthUnitOther: "", layingProduced: "" }];
  });
}

function HubStockQuadCableInsulationHead({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="qs-wip__box-head">
      <h4 className="qs-wip__box-title">Insulation</h4>
      <button
        type="button"
        className="qs-wip__ins-add"
        aria-label="Add size for Insulation"
        title="Add size"
        onClick={onAdd}
      >
        +
      </button>
    </div>
  );
}

function HubStockQuadCableInsulationThead() {
  return (
    <thead>
      <tr>
        <th>Opening</th>
        <th>Production</th>
        <th>Out</th>
        <th>Closing</th>
      </tr>
    </thead>
  );
}

function HubStockQuadCableInsulationTable({ vm }: { vm: TodayHubVm }) {
  const s = bindStockLocals(vm);
  return (
    <div className="qs-wip__table-wrap">
      <table className="qs-wip__table">
        <HubStockQuadCableInsulationThead />
        <tbody>
          <HubStockQuadProcessRow
            proc="Insulation"
            hideProcessLabel
            stockWipCalc={s.stockWipCalc}
            stockOpeningEditable={s.stockOpeningEditable}
            stockWipOpening={s.stockWipOpening}
            setStockWipOpening={s.setStockWipOpening}
            stockProcessQtys={s.stockProcessQtys}
            setStockProcessQtys={s.setStockProcessQtys}
          />
        </tbody>
      </table>
    </div>
  );
}

function HubStockQuadCableInsulationExtrasList({ vm }: { vm: TodayHubVm }) {
  const { stockInsulationExtras, setStockInsulationExtras } =
    bindStockLocals(vm);
  const insSizeOpts = [...getQuadSignalCableSizes("Quad Cable")];
  if (stockInsulationExtras.length === 0) return null;
  return (
    <div className="qs-wip__ins-extras">
      {stockInsulationExtras.map((extra) => (
        <HubStockQuadCableInsulationExtraRow
          key={extra.id}
          extra={extra}
          insSizeOpts={insSizeOpts}
          setExtras={setStockInsulationExtras}
        />
      ))}
    </div>
  );
}

function HubStockQuadCableInsulationFoot({
  vm,
  insStage,
}: {
  vm: TodayHubVm;
  insStage?: { outbound: number; closing: number; opening?: number };
}) {
  const { stockWipCalc } = bindStockLocals(vm);
  if (stockWipCalc == null || insStage == null) return null;
  return (
    <div className="qs-wip__ins-extras-foot" style={{ marginTop: "8px" }}>
      Total insulation out:{" "}
      <span className="qs-wip__calc">{insStage.outbound}</span>
      {" "}· Closing{" "}
      <span className="qs-wip__calc">{insStage.closing}</span>
    </div>
  );
}

export function HubStockQuadCableInsulation({
  vm,
  insStage,
}: {
  vm: TodayHubVm;
  insStage?: { outbound: number; closing: number; opening?: number };
}) {
  const { setStockInsulationExtras, resolvedQuadSizeName } = bindStockLocals(vm);
  return (
    <>
      {/* Box 1: Insulation */}
      <div className="qs-wip__box">
        <HubStockQuadCableInsulationHead
          onAdd={() => addQuadCableInsulationExtra(setStockInsulationExtras, resolvedQuadSizeName)}
        />
        <HubStockQuadCableInsulationTable vm={vm} />
        <HubStockQuadCableInsulationExtrasList vm={vm} />
        <HubStockQuadCableInsulationFoot vm={vm} insStage={insStage} />
      </div>
    </>
  );
}
