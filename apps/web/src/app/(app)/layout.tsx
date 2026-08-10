import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import {
  getAccessiblePlantIds,
  canViewPnl,
  canViewPriceSheet,
  isAdminOrHead,
  isSuperAdmin,
} from "@/lib/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  const role = user?.globalRole;
  const plantIds = user ? await getAccessiblePlantIds(user.id) : [];
  const primaryPlantId = plantIds[0] ?? null;

  const showPnl = role ? canViewPnl(role) : false;
  const showPriceSheet =
    !!user &&
    (user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user));
  const showAdmin = role ? isAdminOrHead(role) : false;
  const showSuper = role ? isSuperAdmin(role) : false;

  return (
    <AppShell
      navFlags={{ showPnl, showPriceSheet, showAdmin, showSuper, primaryPlantId }}
      user={
        user
          ? { name: user.name ?? null, email: user.email ?? "", role: user.globalRole }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
