"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserFormModal } from "@/components/admin/users/UserFormModal";
import { UsersTable } from "@/components/admin/users/UsersTable";
import {
  UsersTableSkeleton,
  UsersToolbarSkeleton,
} from "@/components/admin/users/UsersTableSkeleton";
import { UsersToolbar } from "@/components/admin/users/UsersToolbar";
import {
  ROLE_LABEL,
  ROLES,
  type PlantOption,
  type RoleValue,
  type UserRow,
} from "@/components/admin/users/types";
import "@/components/admin/users/users.css";

export default function AdminUsersPage() {
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
  const pageSize = 10;

  // This page/API is restricted to Super Admins, who may create peer admins.
  const allowSuperAdmin = true;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, plantsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/plants"),
      ]);
      const usersJson = (await usersRes.json()) as {
        ok?: boolean;
        message?: string;
        users?: UserRow[];
      };
      const plantsJson = (await plantsRes.json()) as {
        ok?: boolean;
        message?: string;
        plants?: PlantOption[];
      };
      if (!usersRes.ok || !usersJson.ok) {
        throw new Error(usersJson.message || "Failed to load users");
      }
      if (!plantsRes.ok || !plantsJson.ok) {
        throw new Error(plantsJson.message || "Failed to load plants");
      }
      setUsers(usersJson.users ?? []);
      setPlants(plantsJson.plants ?? []);
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
    setEditing(null);
    setFormError(null);
    setOk(null);
    setShowForm(true);
  }

  function openEdit(user: UserRow) {
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

  async function handleSubmit(payload: {
    email: string;
    name: string;
    phone: string;
    password: string;
    globalRole: RoleValue;
    canViewPriceSheet: boolean;
    isActive: boolean;
    plantIds: string[];
  }) {
    setSaving(true);
    setFormError(null);
    setOk(null);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          name: payload.name.trim() || null,
          phone: payload.phone,
          globalRole: payload.globalRole,
          canViewPriceSheet: payload.canViewPriceSheet,
          isActive: payload.isActive,
          plantIds: payload.plantIds,
        };
        if (payload.password.trim()) body.password = payload.password;
        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.message || "Update failed");
        }
        setOk("User updated.");
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payload.email,
            name: payload.name.trim() || null,
            phone: payload.phone,
            password: payload.password,
            globalRole: payload.globalRole,
            canViewPriceSheet: payload.canViewPriceSheet,
            plantIds: payload.plantIds,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.message || "Create failed");
        }
        setOk("User created.");
      }
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
    if (confirmUser.globalRole === "SUPER_ADMIN") {
      setConfirmUser(null);
      setError("A Super Admin cannot be deactivated.");
      return;
    }
    const nextActive = !confirmUser.isActive;
    setTogglingId(confirmUser.id);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/admin/users/${confirmUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Status update failed");
      }
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

  function exportCsv() {
    const rows = [
      [
        "Name",
        "Email",
        "Mobile",
        "Role",
        "Plants",
        "Credit score",
        "Price Sheet",
        "Status",
      ],
      ...filtered.map((u) => [
        u.name ?? "",
        u.email,
        u.phone ?? "",
        ROLE_LABEL[u.globalRole as (typeof ROLES)[number]] ?? u.globalRole,
        u.globalRole === "SUPER_ADMIN"
          ? "All plants"
          : (u.plantRoles ?? []).map((role) => role.plant.name).join(", "),
        u.creditScore ?? "",
        u.canViewPriceSheet ? "Yes" : "No",
        u.isActive ? "Active" : "Inactive",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell);
            return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="users-page">
      {loading ? (
        <UsersToolbarSkeleton />
      ) : (
        <UsersToolbar
          query={query}
          onQueryChange={setQuery}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          onAddUser={openCreate}
          onExport={exportCsv}
        />
      )}

      {error ? <div className="alert alert--error">{error}</div> : null}
      {ok ? <div className="alert alert--ok">{ok}</div> : null}

      {loading ? (
        <UsersTableSkeleton />
      ) : (
        <UsersTable
          rows={paged}
          onEdit={openEdit}
          onToggleActive={setConfirmUser}
          togglingId={togglingId}
          page={safePage}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />
      )}

      <UserFormModal
        open={showForm}
        editing={editing}
        saving={saving}
        error={formError}
        allowSuperAdmin={allowSuperAdmin}
        plants={plants}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      {confirmUser ? (
        <div className="users-modal is-open" role="presentation">
          <div
            className="users-modal__backdrop"
            onClick={() => setConfirmUser(null)}
            aria-hidden="true"
          />
          <div
            className="users-modal__panel users-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="user-status-title"
            aria-describedby="user-status-copy"
          >
            <div className="users-modal__header">
              <h2 id="user-status-title" className="users-confirm__title">
                {confirmUser.isActive ? "Deactivate user?" : "Activate user?"}
              </h2>
              <button
                type="button"
                className="users-modal__close"
                onClick={() => setConfirmUser(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p id="user-status-copy" className="users-confirm__copy">
              Are you sure you want to{" "}
              {confirmUser.isActive ? "deactivate" : "activate"}{" "}
              <strong>{confirmUser.name || confirmUser.email}</strong>?
              {confirmUser.isActive
                ? " They will not be able to sign in until activated again."
                : " They will be able to sign in again."}
            </p>
            <div className="users-modal__footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmUser(null)}
                disabled={togglingId === confirmUser.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmToggleActive()}
                disabled={togglingId === confirmUser.id}
              >
                {togglingId === confirmUser.id
                  ? "Saving…"
                  : confirmUser.isActive
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
