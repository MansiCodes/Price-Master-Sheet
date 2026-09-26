import { Pagination } from "@/components/ui/Pagination";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { SharedInsulationStatus } from "@/lib/stock-production-status";
import type { StockOrderBySize } from "@/lib/stock/order-excel-types";
import { ALL_SIZES, type DisplayCard } from "./stock-status-format";
import { StockInsulationHero } from "./StockInsulationHero";
import { StockCableCardItem } from "./StockCableCardItem";

export function StockCableCards({
  pagedCards,
  page,
  pageSize,
  listTotal,
  emptyLabel,
  ordersByKey,
  showSignallingInsulation,
  showQuadInsulation,
  sharedInsulation,
  quadInsulation,
  cableTypeOptions,
  activeCable,
  sizeOptions,
  cableSize,
  onCableTypeChange,
  onCableSizeChange,
  onPageChange,
  onPageSizeChange,
}: {
  pagedCards: DisplayCard[];
  page: number;
  pageSize: number;
  listTotal: number;
  emptyLabel: string;
  ordersByKey: Record<string, StockOrderBySize> | null;
  showSignallingInsulation: boolean;
  showQuadInsulation: boolean;
  sharedInsulation: SharedInsulationStatus | null;
  quadInsulation: SharedInsulationStatus | null;
  cableTypeOptions: string[];
  activeCable: string;
  sizeOptions: string[];
  cableSize: string;
  onCableTypeChange: (cable: string) => void;
  onCableSizeChange: (size: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="stock-status-report">
      <div className="stock-status-filters form-grid two">
        <div className="field">
          <label htmlFor="stock-cable-type">Cable type</label>
          <SelectMenu
            id="stock-cable-type"
            value={activeCable}
            options={cableTypeOptions}
            required
            onChange={onCableTypeChange}
          />
        </div>
        <div className="field">
          <label htmlFor="stock-cable-size">Cable size</label>
          <SelectMenu
            id="stock-cable-size"
            value={sizeOptions.includes(cableSize) ? cableSize : ALL_SIZES}
            options={sizeOptions}
            required
            onChange={onCableSizeChange}
          />
        </div>
      </div>

      <ol className="stock-status-grid">
        {showSignallingInsulation ? (
          <StockInsulationHero
            title="Signalling Cable"
            status={sharedInsulation}
            fullWidth={!showQuadInsulation}
          />
        ) : null}
        {showQuadInsulation ? (
          <StockInsulationHero
            title="Quad Cable"
            status={quadInsulation}
            fullWidth={!showSignallingInsulation}
          />
        ) : null}

        {pagedCards.map((card, idx) => (
          <StockCableCardItem
            key={card.key}
            card={card}
            idx={idx}
            page={page}
            pageSize={pageSize}
            emptyLabel={emptyLabel}
            ordersByKey={ordersByKey}
          />
        ))}
      </ol>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={listTotal}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
