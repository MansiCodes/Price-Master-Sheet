"use client";

import { Pagination } from "@/components/ui/Pagination";
import { ROLE_LABEL, ROLES, userInitials, type UserRow } from "./types";

type UsersTableProps = {
  rows: UserRow[];
  emptyMessage?: string;
  onEdit: (user: UserRow) => void;
  onToggleActive: (user: UserRow) => void;
  togglingId?: string | null;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function UsersTable({
  rows,
  emptyMessage = "No users found.",
  onEdit,
  onToggleActive,
  togglingId = null,
  page,
  pageSize,
  total,
  onPageChange,
}: UsersTableProps) {
  return (
    <section className="users-table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Plants</th>
              <th>Credit score</th>
              <th>Price Sheet</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="users-name-cell">
                      <span className="users-avatar" aria-hidden>
                        {userInitials(u.name, u.email)}
                      </span>
                      <span>{u.name || "—"}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="users-pill users-pill--role">
                      {ROLE_LABEL[u.globalRole as (typeof ROLES)[number]] ??
                        u.globalRole}
                    </span>
                  </td>
                  <td>
                    {u.globalRole === "SUPER_ADMIN" ? (
                      <span className="users-pill">All plants</span>
                    ) : (
                      <span className="users-plants-cell">
                        {(u.plantRoles ?? []).map((role) => role.plant.name).join(", ") ||
                          "—"}
                      </span>
                    )}
                  </td>
                  <td>{u.creditScore ?? "—"}</td>
                  <td>
                    <span
                      className={`users-pill ${
                        u.canViewPriceSheet ? "users-pill--yes" : "users-pill--no"
                      }`}
                    >
                      {u.canViewPriceSheet ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`users-switch${u.isActive ? " is-on" : ""}`}
                      role="switch"
                      aria-checked={u.isActive}
                      aria-label={
                        u.globalRole === "SUPER_ADMIN"
                          ? "Super Admin cannot be deactivated"
                          : u.isActive
                            ? `Deactivate ${u.name || u.email}`
                            : `Activate ${u.name || u.email}`
                      }
                      title={
                        u.globalRole === "SUPER_ADMIN"
                          ? "Super Admin cannot be deactivated"
                          : u.isActive
                            ? "Deactivate user"
                            : "Activate user"
                      }
                      disabled={
                        u.globalRole === "SUPER_ADMIN" || togglingId === u.id
                      }
                      onClick={() => onToggleActive(u)}
                    >
                      <span className="users-switch__knob" aria-hidden />
                      <span className="users-switch__label">
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: "0.35rem 0.7rem",
                        fontSize: "0.8rem",
                        flex: "none",
                      }}
                      onClick={() => onEdit(u)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="users-table-card__footer">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
        />
      </div>
    </section>
  );
}
