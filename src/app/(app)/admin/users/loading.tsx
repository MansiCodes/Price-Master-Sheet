import {
  UsersTableSkeleton,
  UsersToolbarSkeleton,
} from "@/components/admin/users/UsersTableSkeleton";

export default function Loading() {
  return (
    <div>
      <h1 className="page-title">Users</h1>
      <p className="page-sub">Loading users…</p>
      <UsersToolbarSkeleton />
      <UsersTableSkeleton />
    </div>
  );
}
