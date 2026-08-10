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
  type RoleValue,
  type UserRow,
} from "@/components/admin/users/types";
import "@/components/admin/users/users.css";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
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
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usersRes = await fetch("/api/admin/users");
      const usersJson = (await usersRes.json()) as {
        ok?: boolean;
        message?: string;
        users?: UserRow[];
      };
      if (!usersRes.ok || !usersJson.ok) {
        throw new Error(usersJson.message || "Failed to load users");
      }
      setUsers(usersJson.users ?? []);
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
    password: string;
    globalRole: RoleValue;
    canViewPriceSheet: boolean;
    isActive: boolean;
  }) {
    setSaving(true);
    setFormError(null);
    setOk(null);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          name: payload.name.trim() || null,
          globalRole: payload.globalRole,
          canViewPriceSheet: payload.canViewPriceSheet,
          isActive: payload.isActive,
          plantIds: [],
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
            password: payload.password,
            globalRole: payload.globalRole,
            canViewPriceSheet: payload.canViewPriceSheet,
            plantIds: [],
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

  function exportCsv() {
    const rows = [
      ["Name", "Email", "Role", "Price Sheet", "Status"],
      ...filtered.map((u) => [
        u.name ?? "",
        u.email,
        ROLE_LABEL[u.globalRole as (typeof ROLES)[number]] ?? u.globalRole,
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
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
