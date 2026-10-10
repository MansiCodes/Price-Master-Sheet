import { useEffect, useState } from "react";

export function useSavedExpenseNames(
  plantId: string,
  expenseHead: string,
  enabled: boolean,
) {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!enabled || !plantId || !expenseHead) {
      setNames([]);
      return;
    }
    const ac = new AbortController();
    const q = new URLSearchParams({
      distinctExpenseNames: "1",
      expenseHead,
    });
    fetch(`/api/plants/${plantId}/petty-cash?${q}`, {
      credentials: "include",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) return { names: [] as string[] };
        return res.json() as Promise<{ names?: string[] }>;
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        setNames(Array.isArray(data.names) ? data.names : []);
      })
      .catch(() => {
        if (!ac.signal.aborted) setNames([]);
      });
    return () => ac.abort();
  }, [plantId, expenseHead, enabled]);
  return names;
}
