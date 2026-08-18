"use client";

import { createElement, useState } from "react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/pnl/DeleteConfirmDialog";
import { deleteJson, patchJson } from "@/lib/client-forms";

export function useReportCrud<T extends { id: string }>(
  apiPath: string,
  reload: () => void,
) {
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function openEdit(row: T, nextValues: Record<string, string>) {
    setEditing(row);
    setValues(nextValues);
    setError(null);
  }

  function closeEdit() {
    if (saving) return;
    setEditing(null);
    setError(null);
  }

  async function save(body: Record<string, unknown>) {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const result = await patchJson(`${apiPath}`, { id: editing.id, ...body });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Entry updated");
    setEditing(null);
    reload();
  }

  function remove(id: string) {
    if (deleting) return;
    setPendingDeleteId(id);
  }

  function cancelDelete() {
    if (deleting) return;
    setPendingDeleteId(null);
  }

  async function confirmDelete() {
    if (!pendingDeleteId || deleting) return;
    setDeleting(true);
    const result = await deleteJson(
      `${apiPath}?id=${encodeURIComponent(pendingDeleteId)}&confirm=true`,
      { confirm: true },
    );
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry deleted");
    setPendingDeleteId(null);
    reload();
  }

  const deleteDialog = createElement(DeleteConfirmDialog, {
    open: Boolean(pendingDeleteId),
    deleting,
    onNo: cancelDelete,
    onYes: () => void confirmDelete(),
  });

  return {
    editing,
    values,
    saving,
    deleting,
    error,
    setField,
    openEdit,
    closeEdit,
    save,
    remove,
    deleteDialog,
  };
}
