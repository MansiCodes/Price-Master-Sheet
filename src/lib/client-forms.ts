"use client";

export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function postJson<T>(
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: unknown;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: json.error ?? `Request failed (${res.status})`,
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
