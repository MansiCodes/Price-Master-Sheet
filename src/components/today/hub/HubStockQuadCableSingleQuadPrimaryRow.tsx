import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

function HubStockQuadCableSingleQuadOtherSize({ vm }: { vm: TodayHubVm }) {
  const { stockCableSize, stockCableSizeOther, setStockCableSizeOther } = bindStockLocals(vm);
  if (stockCableSize !== "Other") return null;
  return (
    <input
      id="st-cable-size-other"
      required
      placeholder="Enter size"
      style={{ marginTop: "4px" }}
      value={stockCableSizeOther}
      onChange={(e) => setStockCableSizeOther(e.target.value)}
    />
  );
}

function HubStockQuadCableSingleQuadSizeCell({
  vm,
  primaryQuadFactor,
}: {
  vm: TodayHubVm;
  primaryQuadFactor: number;
}) {
  const { stockCableSize, setStockCableSize, setStockCableSizeOther, quadCableSizeOptions } =
    bindStockLocals(vm);
  return (
    <td style={{ minWidth: "140px" }}>
      <SelectMenu
        id="st-cable-size"
        value={stockCableSize}
        options={quadCableSizeOptions}
        required
        onChange={(next) => {
          setStockCableSize(next);
          if (next !== "Other") setStockCableSizeOther("");
        }}
      />
      <HubStockQuadCableSingleQuadOtherSize vm={vm} />
      <span style={{ display: "block", fontSize: "10px", color: "#666", fontWeight: "normal", marginTop: "2px" }}>
        (Factor: {primaryQuadFactor})
      </span>
    </td>
  );
}

function HubStockQuadCableSingleQuadOpeningCell({
  vm,
  singleQuadStage,
}: {
  vm: TodayHubVm;
  singleQuadStage?: { outbound: number; closing: number; opening: number };
}) {
  const { stockOpeningEditable, stockWipOpening, setStockWipOpening } = bindStockLocals(vm);
  return (
    <td className="qs-wip__num">
      {stockOpeningEditable ? (
        <DecimalInput
          id="st-open-Single Quad"
          value={stockWipOpening["Single Quad"] ?? ""}
          onChange={(next) =>
            setStockWipOpening((prev) => ({ ...prev, "Single Quad": next }))
          }
          placeholder="0"
        />
      ) : (
        singleQuadStage?.opening ?? 0
      )}
    </td>
  );
}

function HubStockQuadCableSingleQuadQtyCell({
  vm,
  field,
  id,
}: {
  vm: TodayHubVm;
  field: "Single Quad" | "Laying";
  id: string;
}) {
  const { stockProcessQtys, setStockProcessQtys } = bindStockLocals(vm);
  return (
    <td>
      <DecimalInput
        id={id}
        value={stockProcessQtys[field] ?? ""}
        onChange={(next) =>
          setStockProcessQtys((prev) => ({ ...prev, [field]: next }))
        }
        placeholder="0"
      />
    </td>
  );
}

export function HubStockQuadCableSingleQuadPrimaryRow({
  vm,
  primaryQuadFactor,
  primaryRowOutbound,
  singleQuadStage,
}: {
  vm: TodayHubVm;
  primaryQuadFactor: number;
  primaryRowOutbound: number;
  singleQuadStage?: { outbound: number; closing: number; opening: number };
}) {
  return (
    <tr>
      <HubStockQuadCableSingleQuadSizeCell vm={vm} primaryQuadFactor={primaryQuadFactor} />
      <HubStockQuadCableSingleQuadOpeningCell vm={vm} singleQuadStage={singleQuadStage} />
      <HubStockQuadCableSingleQuadQtyCell vm={vm} field="Single Quad" id="st-proc-Single Quad" />
      <HubStockQuadCableSingleQuadQtyCell vm={vm} field="Laying" id="st-proc-Laying" />
      <td className="qs-wip__num qs-wip__calc">
        {primaryRowOutbound > 0 ? `${primaryRowOutbound} km` : "0 km"}
      </td>
      <td className="qs-wip__num qs-wip__calc">
        {singleQuadStage != null ? `${singleQuadStage.closing} km` : "—"}
      </td>
      <td></td>
    </tr>
  );
}
