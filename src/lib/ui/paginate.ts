/** Pure, framework-agnostic pagination slicing shared by API routes and hooks. */
export type PaginateResult<T> = {
  slice: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginateResult<T> {
  const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const requested = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePage = Math.min(Math.max(1, requested), totalPages);
  const start = (safePage - 1) * size;

  return {
    slice: items.slice(start, start + size),
    page: safePage,
    pageSize: size,
    total,
    totalPages,
  };
}
