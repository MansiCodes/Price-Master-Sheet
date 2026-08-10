import { redirect } from "next/navigation";

/** Export removed — keep route from breaking old bookmarks. */
export default function AdminExportRemoved() {
  redirect("/admin/users");
}
