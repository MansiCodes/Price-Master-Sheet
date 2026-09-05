import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { canViewPriceSheet } from "@/lib/rbac";
import "./price-sheet.css";

export default async function PriceSheetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const allowed =
    !!session?.user &&
    (session.user.globalRole === GlobalRole.SUPER_ADMIN ||
      canViewPriceSheet(session.user));

  if (!allowed) {
    return (
      <div className="ps-root">
        <div className="ps-atmosphere" aria-hidden="true" />
        <div className="ps-denied">
          <h1>Access Denied</h1>
          <p>You do not have permission to view the price sheet.</p>
        </div>
      </div>
    );
  }

  return children;
}
