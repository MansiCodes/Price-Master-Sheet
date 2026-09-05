import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminOrHead, isSuperAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/** Admin hub collapsed — jump to Users or Audit. */
export default async function AdminHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.globalRole;
  if (isSuperAdmin(role)) redirect("/admin/users");
  if (isAdminOrHead(role)) redirect("/admin/audit");
  redirect("/");
}
