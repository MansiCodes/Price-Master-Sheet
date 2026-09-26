"use client";

import { PREVIEW_LIMIT } from "./types";

type ShareBulkBarProps = {
  selectedCount: number;
  savedLength: number;
  sending: boolean;
  onSelectAll: () => void;
  onClear: () => void;
};

export function ShareBulkBar({
  selectedCount,
  savedLength,
  sending,
  onSelectAll,
  onClear,
}: ShareBulkBarProps) {
  return (
    <div className="ps-share-bulk">
      <p className="ps-share-bulk__hint">
        {selectedCount} of {savedLength} selected
      </p>
      <div className="ps-share-bulk__actions">
        <button
          type="button"
          className="ps-share-link-btn"
          disabled={sending || savedLength === 0}
          onClick={onSelectAll}
        >
          Select all
        </button>
        <button
          type="button"
          className="ps-share-link-btn"
          disabled={sending || selectedCount === 0}
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

type ShareViewAllBarProps = {
  savedLength: number;
  selectedCount: number;
  sending: boolean;
  onViewAll: () => void;
};

export function ShareViewAllBar({
  savedLength,
  selectedCount,
  sending,
  onViewAll,
}: ShareViewAllBarProps) {
  return (
    <div className="ps-share-view-all">
      <span className="ps-share-view-all__meta">
        Showing {PREVIEW_LIMIT} of {savedLength}
        {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
      </span>
      <button
        type="button"
        className="ps-share-link-btn"
        disabled={sending}
        onClick={onViewAll}
      >
        View all
      </button>
    </div>
  );
}

type ShareModalFooterProps = {
  viewAll: boolean;
  sending: boolean;
  selectedRowsLength: number;
  selectedPhonesSize: number;
  selectedCount: number;
  onDone: () => void;
  onClose: () => void;
  onShare: () => void;
};

export function ShareModalFooter({
  viewAll,
  sending,
  selectedRowsLength,
  selectedPhonesSize,
  selectedCount,
  onDone,
  onClose,
  onShare,
}: ShareModalFooterProps) {
  return (
    <footer className="ps-share-foot">
      {viewAll ? (
        <button
          type="button"
          className="ps-btn ps-btn-primary"
          disabled={sending}
          onClick={onDone}
        >
          Done
        </button>
      ) : (
        <>
          <button
            type="button"
            className="ps-btn ps-btn-ghost"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ps-btn ps-btn-primary"
            disabled={selectedRowsLength === 0 || selectedPhonesSize === 0 || sending}
            onClick={onShare}
          >
            {sending
              ? "Sending PDF…"
              : selectedCount > 0
                ? `Share PDF (${selectedCount})`
                : "Share PDF"}
          </button>
        </>
      )}
    </footer>
  );
}
