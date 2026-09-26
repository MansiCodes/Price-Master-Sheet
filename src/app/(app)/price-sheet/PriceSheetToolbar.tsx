import { SelectMenu } from "@/components/ui/SelectMenu";
import { ExportIcon, ShareIcon, SyncIcon } from "@/app/(app)/price-sheet/PriceSheetIcons";

export function PriceSheetToolbar({
  query,
  onQueryChange,
  syncing,
  selectionMode,
  shareButtonLabel,
  selectedCount,
  onSync,
  onShare,
  onExport,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  syncing: boolean;
  selectionMode: boolean;
  shareButtonLabel: string;
  selectedCount: number;
  onSync: () => void;
  onShare: () => void;
  onExport: () => void;
}) {
  return (
    <header className="ps-top">
      <div className="ps-toolbar">
        <label className="ps-search-wrap">
          <span className="ps-sr-only">Search cable</span>
          <span className="ps-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search cable or S NO"
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </label>

        <div className="ps-toolbar-actions">
          <button
            type="button"
            className="ps-btn ps-btn-primary ps-desktop-inline"
            disabled={syncing}
            onClick={onSync}
          >
            <SyncIcon />
            Sync
          </button>
          <button
            type="button"
            className={`ps-btn ps-btn-secondary ps-desktop-inline${selectionMode ? " ps-btn-share-active" : ""}`}
            title={
              selectionMode
                ? selectedCount
                  ? "Add WhatsApp numbers and share"
                  : "Select cables to share"
                : "Select cables to share"
            }
            onClick={onShare}
          >
            <ShareIcon />
            {shareButtonLabel}
          </button>
          <button
            type="button"
            className="ps-btn ps-btn-secondary ps-desktop-inline"
            title="Export CSV"
            onClick={onExport}
          >
            <ExportIcon />
            Export
          </button>
        </div>
      </div>

      <div className="ps-header-actions ps-mobile-only">
        <button
          type="button"
          className="ps-icon-btn ps-icon-btn-primary"
          title="Sync Sheet"
          aria-label="Sync Sheet"
          disabled={syncing}
          onClick={onSync}
        >
          <SyncIcon size={20} />
        </button>
        <button
          type="button"
          className={`ps-icon-btn${selectionMode ? " ps-btn-share-active" : ""}`}
          title="Share selected"
          aria-label="Share selected"
          onClick={onShare}
        >
          <ShareIcon size={20} />
        </button>
        <button
          type="button"
          className="ps-icon-btn"
          title="Export CSV"
          aria-label="Export CSV"
          onClick={onExport}
        >
          <ExportIcon size={20} />
        </button>
      </div>
    </header>
  );
}
