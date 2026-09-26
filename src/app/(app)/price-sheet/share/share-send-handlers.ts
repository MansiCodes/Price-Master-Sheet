import { FormEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CableRate } from "@/lib/sheets/types";
import { toIndiaPhoneE164 } from "@/lib/phone";
import type { SavedRecipient } from "./types";

export async function loadSavedRecipients(): Promise<{
  rows: SavedRecipient[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/price-sheet/recipients");
    const payload = (await response.json()) as {
      rows?: SavedRecipient[];
      error?: string;
    };
    if (!response.ok) {
      return { rows: [], error: payload.error || "Could not load contacts." };
    }
    return { rows: Array.isArray(payload.rows) ? payload.rows : [] };
  } catch {
    return { rows: [], error: "Could not load contacts." };
  }
}

export function toggleSaved(
  setSelectedPhones: Dispatch<SetStateAction<Set<string>>>,
  phone: string,
) {
  setSelectedPhones((prev) => {
    const next = new Set(prev);
    if (next.has(phone)) next.delete(phone);
    else next.add(phone);
    return next;
  });
}

export function selectAll(
  setSelectedPhones: Dispatch<SetStateAction<Set<string>>>,
  saved: SavedRecipient[],
) {
  setSelectedPhones(new Set(saved.map((row) => row.phone)));
}

export function clearSelection(
  setSelectedPhones: Dispatch<SetStateAction<Set<string>>>,
) {
  setSelectedPhones(new Set());
}

export function onAddNumber(
  e: FormEvent,
  newName: string,
  newPhone: string,
  setError: Dispatch<SetStateAction<string | null>>,
  setSelectedPhones: Dispatch<SetStateAction<Set<string>>>,
  setSaved: Dispatch<SetStateAction<SavedRecipient[]>>,
  setNewName: Dispatch<SetStateAction<string>>,
  setNewPhone: Dispatch<SetStateAction<string>>,
) {
  e.preventDefault();
  setError(null);
  const name = newName.trim() || "Customer";
  const e164 = toIndiaPhoneE164(newPhone);
  if (!e164) {
    setError("Enter a valid 10-digit mobile number.");
    return;
  }
  setSelectedPhones((prev) => new Set(prev).add(e164));
  setSaved((prev) => {
    const existing = prev.find((row) => row.phone === e164);
    if (existing) {
      return prev.map((row) =>
        row.phone === e164 ? { ...row, label: name } : row,
      );
    }
    return [{ id: `new-${e164}`, phone: e164, label: name }, ...prev];
  });
  setNewName("");
  setNewPhone("");
}

export async function removeSaved(
  id: string,
  phone: string,
  setSelectedPhones: Dispatch<SetStateAction<Set<string>>>,
  setSaved: Dispatch<SetStateAction<SavedRecipient[]>>,
) {
  setSelectedPhones((prev) => {
    const next = new Set(prev);
    next.delete(phone);
    return next;
  });
  setSaved((prev) => prev.filter((row) => row.id !== id));

  if (!id.startsWith("new-")) {
    await fetch(`/api/price-sheet/recipients?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => null);
  }
}

export async function onShare(opts: {
  selectedRows: CableRate[];
  selectedPhones: Set<string>;
  saved: SavedRecipient[];
  setSending: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSuccess: Dispatch<SetStateAction<string | null>>;
  setSaved: Dispatch<SetStateAction<SavedRecipient[]>>;
  onShared: () => void;
  onClose: () => void;
}) {
  if (opts.selectedRows.length === 0) {
    opts.setError("Select at least one cable.");
    return;
  }
  if (opts.selectedPhones.size === 0) {
    opts.setError("Select a contact.");
    return;
  }

  const recipients = [...opts.selectedPhones].map((phone) => {
    const row = opts.saved.find((r) => r.phone === phone);
    return {
      phone,
      name: row?.label?.trim() || "Customer",
    };
  });

  opts.setSending(true);
  opts.setError(null);
  opts.setSuccess(null);

  try {
    const response = await fetch("/api/price-sheet/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients,
        rows: opts.selectedRows,
      }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      message?: string;
      sent?: number;
      failed?: number;
      results?: { phone: string; ok: boolean; message?: string }[];
    };

    if (!response.ok || !payload.ok) {
      const firstFail = payload.results?.find((r) => !r.ok)?.message;
      opts.setError(
        firstFail ||
          payload.message ||
          "Could not send PDF. Check Integrations + Cloudinary.",
      );
      return;
    }

    const sent = payload.sent ?? recipients.length;
    const failed = payload.failed ?? 0;

    opts.setSuccess(
      failed > 0
        ? `Sent to ${sent}, ${failed} failed.`
        : `Sent to ${sent}.`,
    );

    try {
      const savedRes = await fetch("/api/price-sheet/recipients");
      const savedPayload = (await savedRes.json()) as { rows?: SavedRecipient[] };
      if (savedRes.ok && Array.isArray(savedPayload.rows)) {
        opts.setSaved(savedPayload.rows);
      }
    } catch {
      // ignore
    }

    window.setTimeout(() => {
      opts.onShared();
      opts.onClose();
    }, 1200);
  } catch {
    opts.setError("Could not send PDF. Try again.");
  } finally {
    opts.setSending(false);
  }
}
