import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canViewUsersDirectory } from "@/lib/rbac";

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { globalRole: true, canManageUsers: true },
  });
  if (
    !actor ||
    !canViewUsersDirectory(actor.globalRole, {
      canManageUsers: actor.canManageUsers,
    })
  ) {
    return (
      <div>
        <h1 className="page-title">Access denied</h1>
        <p className="page-sub">You do not have access to the users directory.</p>
      </div>
    );
  }
  return children;
}
