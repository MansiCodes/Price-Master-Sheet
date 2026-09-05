"use client";

import { useTranslations } from "next-intl";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { Pagination } from "@/components/ui/Pagination";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";

type ContactRow = {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  designation: string | null;
};

export function ContactListReport({
  plantId,
}: {
  plantId: string;
}) {
  const t = useTranslations("pnl");
  const baseUrl = `/api/plants/${plantId}/contacts`;
  const { rows, loading, error, reload, page, pageSize, total, setPage, setPageSize } =
    usePaginatedReport<ContactRow>(baseUrl, "Failed to load contacts");

  const crud = useReportCrud<ContactRow>(
    `/api/plants/${plantId}/contacts`,
    reload,
  );

  const columns: ReportColumn<ContactRow>[] = [
    {
      key: "sno",
      label: "S.No",
      render: (_r, index) => String((index ?? 0) + 1),
    },
    {
      key: "name",
      label: "Name",
      wrap: true,
      render: (r) => r.name,
    },
    {
      key: "phone",
      label: "Phone",
      render: (r) => r.phone || "—",
    },
    {
      key: "category",
      label: "Material / Category",
      wrap: true,
      render: (r) => r.category || "—",
    },
    {
      key: "designation",
      label: "Designation",
      render: (r) => r.designation || "—",
    },
    {
      key: "actions",
      label: "Actions",
      compact: true,
      width: "8.75rem",
      render: (r) => (
        <ReportRowActions
          onEdit={() =>
            crud.openEdit(r, {
              name: r.name ?? "",
              phone: r.phone ?? "",
              category: r.category ?? "",
              designation: r.designation ?? "",
            })
          }
          onDelete={() => void crud.remove(r.id)}
        />
      ),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">Contact List</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        variant="register"
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      <EntryEditDrawer
        open={Boolean(crud.editing)}
        title="Edit Contact"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "phone", label: "Phone" },
          { name: "category", label: "Material / Category" },
          { name: "designation", label: "Designation" },
        ]}
        values={crud.values}
        saving={crud.saving}
        error={crud.error}
        onChange={crud.setField}
        onClose={crud.closeEdit}
        onSave={() =>
          void crud.save({
            name: crud.values.name,
            phone: crud.values.phone || null,
            category: crud.values.category || null,
            designation: crud.values.designation || null,
          })
        }
      />
      {crud.deleteDialog}
    </section>
  );
}
