import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canViewUsersDirectory } from "@/lib/rbac";

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canViewUsersDirectory(session.user.globalRole)) {
    return (
      <div>
        <h1 className="page-title">Access denied</h1>
        <p className="page-sub">You do not have access to the users directory.</p>
      </div>
    );
  }
  return children;
}
