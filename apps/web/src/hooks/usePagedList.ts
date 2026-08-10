"use client";

import { useCallback, useEffect, useState } from "react";

export type PagedResponse<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type UsePagedListResult<T> = {
  rows: T[];
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Client-side hook for a paginated list backed by a GET endpoint that
 * accepts `page` and `pageSize` query params and returns a `PagedResponse`.
 */
export function usePagedList<T>(
  baseUrl: string,
  pageSize = 10,
): UsePagedListResult<T> {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${baseUrl}?page=${page}&pageSize=${pageSize}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as Partial<
        PagedResponse<T>
      > & { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        return;
      }
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, page, pageSize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, page, setPage, pageSize, total, totalPages, loading, error, refresh };
}
