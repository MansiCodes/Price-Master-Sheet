import type { AuditRow } from "./types";

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function auditRowsToCsv(rows: AuditRow[]): string {
  const header = ["When", "Actor", "Email", "Entity", "Field", "Backdated", "Change"];
  const lines = rows.map((r) => [
    r.createdAt,
    r.actorName,
    r.actorEmail,
    r.entityType,
    r.field ?? "",
    r.isBackdated ? "Yes" : "No",
    r.newValue ?? "",
  ]);
  return [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadTextFile(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
