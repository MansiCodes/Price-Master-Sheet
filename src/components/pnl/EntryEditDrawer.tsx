"use client";

import { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";

export type EditField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea";
  required?: boolean;
};

export function toYmd(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function EntryEditDrawer({
  open,
  title,
  fields,
  values,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fields: EditField[];
  values: Record<string, string>;
  saving?: boolean;
  error?: string | null;
  onChange: (name: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="report-edit-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      {error ? <div className="alert alert--error">{error}</div> : null}
      <form id="report-edit-form" className="form-grid" onSubmit={submit}>
        {fields.map((field) => (
          <div key={field.name} className="field">
            <label htmlFor={`edit-${field.name}`}>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                id={`edit-${field.name}`}
                required={field.required}
                rows={3}
                value={values[field.name] ?? ""}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            ) : (
              <input
                id={`edit-${field.name}`}
                type={field.type === "number" ? "text" : field.type ?? "text"}
                inputMode={field.type === "number" ? "decimal" : undefined}
                required={field.required}
                value={values[field.name] ?? ""}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </form>
    </SlideOver>
  );
}
