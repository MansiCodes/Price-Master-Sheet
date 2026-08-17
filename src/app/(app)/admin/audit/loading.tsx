import {
  AuditTableSkeleton,
  AuditToolbarSkeleton,
} from "@/components/admin/audit/AuditSkeleton";
import "@/components/admin/audit/audit.css";

export default function Loading() {
  return (
    <div className="audit-page">
      <AuditToolbarSkeleton />
      <AuditTableSkeleton />
    </div>
  );
}
