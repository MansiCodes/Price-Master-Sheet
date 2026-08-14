import { redirect } from "next/navigation";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";

export default async function AdminIntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.globalRole !== GlobalRole.SUPER_ADMIN) {
    return (
      <div>
        <h1 className="page-title">Access denied</h1>
        <p className="page-sub">Only Super Admin can manage integrations.</p>
      </div>
    );
  }
  return children;
}
