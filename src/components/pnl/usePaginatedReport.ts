"use client";

import { useEffect, useState } from "react";

export const DEFAULT_REPORT_PAGE_SIZE = 10;
export const REPORT_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

type PaginatedResponse<T> = {
  rows?: T[];
  page?: number;
  total?: number;
  error?: string;
  [key: string]: unknown;
};

export function usePaginatedReport<T>(
  baseUrl: string,
  fallbackError: string,
  initialPageSize = DEFAULT_REPORT_PAGE_SIZE,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PaginatedResponse<T> | null>(null);

  useEffect(() => {
    setPage(1);
  }, [baseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const separator = baseUrl.includes("?") ? "&" : "?";
        const res = await fetch(
          `${baseUrl}${separator}page=${page}&pageSize=${pageSize}`,
        );
        const json = (await res.json()) as PaginatedResponse<T>;
        if (!res.ok) {
          if (!cancelled) {
            setError(json.error ?? fallbackError);
            setRows([]);
            setTotal(0);
            setResponse(null);
          }
          return;
        }
        if (!cancelled) {
          setRows(json.rows ?? []);
          setTotal(json.total ?? 0);
          setResponse(json);
          if (json.page && json.page !== page) {
            setPage(json.page);
          }
        }
      } catch {
        if (!cancelled) {
          setError(fallbackError);
          setRows([]);
          setTotal(0);
          setResponse(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, fallbackError, page, pageSize]);

  function changePageSize(nextPageSize: number) {
    setPage(1);
    setPageSize(nextPageSize);
  }

  return {
    rows,
    page,
    pageSize,
    total,
    loading,
    error,
    response,
    setPage,
    setPageSize: changePageSize,
  };
}
