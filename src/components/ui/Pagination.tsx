"use client";

import { useTranslations } from "next-intl";
import { REPORT_PAGE_SIZE_OPTIONS } from "@/components/pnl/usePaginatedReport";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const t = useTranslations("common");
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <div className="pagination__summary">
        <span className="pagination__info">
          {t("rangeOf", { start, end, total })}
        </span>
        {onPageSizeChange ? (
          <label className="pagination__page-size">
            <span>{t("rowsPerPage")}</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              aria-label={t("rowsPerPage")}
            >
              {REPORT_PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="pagination__controls">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("previous")}
        </button>
        <span>
          {t("pageOf", { page, totalPages })}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
