import { SelectMenu } from "@/components/ui/SelectMenu";
import { PAGE_SIZE_LABELS, PAGE_SIZES } from "@/app/(app)/price-sheet/price-sheet-utils";

export function PriceSheetPagination({
  pageSize,
  pageList,
  safePage,
  totalPages,
  loading,
  filteredLength,
  isCompact,
  onPageSizeChange,
  onPageChange,
}: {
  pageSize: number;
  pageList: number[];
  safePage: number;
  totalPages: number;
  loading: boolean;
  filteredLength: number;
  isCompact: boolean;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number | ((p: number) => number)) => void;
}) {
  return (
    <nav className="ps-pagination" aria-label="Rates pagination">
      <div className="ps-page-size-wrap">
        <span className="ps-field-label">Per page</span>
        <SelectMenu
          className="ps-page-size-select"
          value={String(pageSize)}
          options={PAGE_SIZE_LABELS}
          onChange={(next) => {
            const size = Number(next);
            onPageSizeChange(
              PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number]) ? size : 10,
            );
          }}
        />
      </div>

      <div className="ps-pagination__nav">
        <button
          type="button"
          className="ps-page-nav"
          disabled={loading || safePage <= 1 || filteredLength === 0}
          aria-label="Previous page"
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
        >
          <span className="ps-desktop-inline">Prev</span>
          <span className="ps-mobile-only" aria-hidden="true">
            ‹
          </span>
        </button>

        <div className="ps-page-numbers">
          {!loading && filteredLength > 0
            ? (() => {
                const lastShown = pageList[pageList.length - 1] ?? 0;
                const showTrailingEllipsis =
                  isCompact && lastShown > 0 && lastShown < totalPages;
                return (
                  <>
                    {pageList.flatMap((page, index) => {
                      const prev = pageList[index - 1];
                      const showEllipsis =
                        prev !== undefined && page - prev > 1;
                      const items = [];
                      if (showEllipsis) {
                        items.push(
                          <span
                            key={`e-${page}`}
                            className="ps-page-ellipsis"
                            aria-hidden="true"
                          >
                            …
                          </span>,
                        );
                      }
                      items.push(
                        <button
                          key={page}
                          type="button"
                          className={`ps-page-btn${page === safePage ? " is-active" : ""}`}
                          aria-label={`Page ${page}`}
                          aria-current={
                            page === safePage ? "page" : undefined
                          }
                          disabled={loading}
                          onClick={() => onPageChange(page)}
                        >
                          {page}
                        </button>,
                      );
                      return items;
                    })}
                    {showTrailingEllipsis ? (
                      <span className="ps-page-ellipsis" aria-hidden="true">
                        …
                      </span>
                    ) : null}
                  </>
                );
              })()
            : null}
        </div>

        <button
          type="button"
          className="ps-page-nav"
          disabled={loading || safePage >= totalPages || filteredLength === 0}
          aria-label="Next page"
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
        >
          <span className="ps-desktop-inline">Next</span>
          <span className="ps-mobile-only" aria-hidden="true">
            ›
          </span>
        </button>
      </div>
    </nav>
  );
}
