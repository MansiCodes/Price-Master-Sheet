"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ROLE_LABEL,
  ROLES,
  type PlantOption,
  type UserRow,
} from "./types";
import {
  exportUsersCsv,
  loadUsersAdminData,
  patchUserActive,
  saveUserForm,
  type UserFormSubmitPayload,
} from "./users-admin-api";

export function useUsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [canManageSuperAdmins, setCanManageSuperAdmins] = useState(false);
  const [primarySuperAdminEmail, setPrimarySuperAdminEmail] = useState<
    string | null
  >(null);
  const pageSize = 10;

  const allowSuperAdmin = canManage;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadUsersAdminData();
      setUsers(data.users);
      setPlants(data.plants);
      setCanManage(data.canManage);
      setCanManageSuperAdmins(data.canManageSuperAdmins);
      setPrimarySuperAdminEmail(data.primarySuperAdminEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.globalRole !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q) ||
        (ROLE_LABEL[u.globalRole as (typeof ROLES)[number]] ?? u.globalRole)
          .toLowerCase()
          .includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter]);

  function openCreate() {
    if (!canManage) return;
    setEditing(null);
    setFormError(null);
    setOk(null);
    setShowForm(true);
  }

  function openEdit(user: UserRow) {
    if (!canManage) return;
    setEditing(user);
    setFormError(null);
    setOk(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError(null);
  }

  async function handleSubmit(payload: UserFormSubmitPayload) {
    setSaving(true);
    setFormError(null);
    setOk(null);
    try {
      const message = await saveUserForm(editing, payload);
      setOk(message);
      closeForm();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmToggleActive() {
    if (!confirmUser) return;
    if (confirmUser.globalRole === "SUPER_ADMIN" && !canManageSuperAdmins) {
      setConfirmUser(null);
      setError(
        "Only the primary Super Admin can activate or deactivate Super Admins.",
      );
      return;
    }
    if (
      primarySuperAdminEmail &&
      confirmUser.email.trim().toLowerCase() === primarySuperAdminEmail &&
      confirmUser.isActive
    ) {
      setConfirmUser(null);
      setError("The primary Super Admin account cannot be deactivated.");
      return;
    }
    const nextActive = !confirmUser.isActive;
    setTogglingId(confirmUser.id);
    setError(null);
    setOk(null);
    try {
      await patchUserActive(confirmUser.id, nextActive);
      setOk(
        nextActive
          ? `${confirmUser.name || confirmUser.email} is now active.`
          : `${confirmUser.name || confirmUser.email} is now inactive.`,
      );
      setConfirmUser(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setTogglingId(null);
    }
  }

  return {
    plants,
    error,
    formError,
    ok,
    loading,
    saving,
    showForm,
    editing,
    query,
    setQuery,
    roleFilter,
    setRoleFilter,
    confirmUser,
    setConfirmUser,
    togglingId,
    canManage,
    canManageSuperAdmins,
    primarySuperAdminEmail,
    pageSize,
    allowSuperAdmin,
    filtered,
    safePage,
    paged,
    setPage,
    openCreate,
    openEdit,
    closeForm,
    handleSubmit,
    confirmToggleActive,
    exportCsv: () => exportUsersCsv(filtered),
  };
}
