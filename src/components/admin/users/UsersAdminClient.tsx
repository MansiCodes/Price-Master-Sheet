"use client";

import { UserFormModal } from "@/components/admin/users/UserFormModal";
import { UsersTable } from "@/components/admin/users/UsersTable";
import {
  UsersTableSkeleton,
  UsersToolbarSkeleton,
} from "@/components/admin/users/UsersTableSkeleton";
import { UsersToolbar } from "@/components/admin/users/UsersToolbar";
import { UsersStatusConfirmModal } from "@/components/admin/users/UsersStatusConfirmModal";
import { useUsersAdmin } from "@/components/admin/users/useUsersAdmin";
import "@/components/admin/users/users.css";

export function UsersAdminClient() {
  const {
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
    exportCsv,
  } = useUsersAdmin();

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
          readOnly={!canManage}
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
          readOnly={!canManage}
          canManageSuperAdmins={canManageSuperAdmins}
          primarySuperAdminEmail={primarySuperAdminEmail}
        />
      )}

      {canManage ? (
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
      ) : null}

      {canManage && confirmUser ? (
        <UsersStatusConfirmModal
          confirmUser={confirmUser}
          togglingId={togglingId}
          onCancel={() => setConfirmUser(null)}
          onConfirm={() => void confirmToggleActive()}
        />
      ) : null}
    </div>
  );
}
