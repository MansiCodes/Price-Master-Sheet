"use client";

import { useTranslations } from "next-intl";
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
  emptyMessage,
  onEdit,
  onToggleActive,
  togglingId = null,
  page,
  pageSize,
  total,
  onPageChange,
}: UsersTableProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  return (
    <section className="users-table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("email")}</th>
              <th>{t("role")}</th>
              <th>{t("plantsCol")}</th>
              <th>{t("priceSheet")}</th>
              <th>{t("status")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  {emptyMessage ?? t("noUsers")}
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
                      <span>{u.name || tCommon("dash")}</span>
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
                      <span className="users-pill">{t("allPlants")}</span>
                    ) : (
                      <span className="users-plants-cell">
                        {(u.plantRoles ?? [])
                          .map((role) => role.plant.name)
                          .join(", ") || tCommon("dash")}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`users-pill ${
                        u.canViewPriceSheet
                          ? "users-pill--yes"
                          : "users-pill--no"
                      }`}
                    >
                      {u.canViewPriceSheet ? t("yes") : t("no")}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`users-switch${u.isActive ? " is-on" : ""}`}
                      role="switch"
                      aria-checked={u.isActive}
                      disabled={
                        u.globalRole === "SUPER_ADMIN" || togglingId === u.id
                      }
                      onClick={() => onToggleActive(u)}
                    >
                      <span className="users-switch__knob" aria-hidden />
                      <span className="users-switch__label">
                        {u.isActive ? t("active") : t("inactive")}
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
                      {t("edit")}
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
