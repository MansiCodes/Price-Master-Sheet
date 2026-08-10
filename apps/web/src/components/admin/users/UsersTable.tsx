"use client";

import { Pagination } from "@/components/ui/Pagination";
import { ROLE_LABEL, ROLES, userInitials, type UserRow } from "./types";

type UsersTableProps = {
  rows: UserRow[];
  emptyMessage?: string;
  onEdit: (user: UserRow) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function UsersTable({
  rows,
  emptyMessage = "No users found.",
  onEdit,
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
              <th>Price Sheet</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
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
                    <span
                      className={`users-pill ${
                        u.canViewPriceSheet ? "users-pill--yes" : "users-pill--no"
                      }`}
                    >
                      {u.canViewPriceSheet ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`users-pill ${
                        u.isActive ? "users-pill--yes" : "users-pill--no"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
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
