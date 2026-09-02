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
      message?: string;
      details?: unknown;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: json.error ?? json.message ?? `Request failed (${res.status})`,
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function sendJson<T>(
  url: string,
  method: "PATCH" | "DELETE",
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: json.error ?? json.message ?? `Request failed (${res.status})`,
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export function patchJson<T>(url: string, body: unknown) {
  return sendJson<T>(url, "PATCH", body);
}

export function deleteJson<T>(url: string, body?: unknown) {
  return sendJson<T>(url, "DELETE", body);
}
