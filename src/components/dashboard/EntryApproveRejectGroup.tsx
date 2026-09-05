"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EntryApprovalKind } from "@/lib/entry-approval-types";

export function EntryApproveRejectGroup({
  entryId,
  kind,
}: {
  entryId: string;
  kind: EntryApprovalKind;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");

  const handleAction = (action: "approve_head" | "reject_head", rejectReason?: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/entries/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: entryId,
            kind,
            action,
            reason: rejectReason,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to process request");
        }

        toast.success(
          action === "approve_head" ? "Entry approved" : "Entry rejected",
        );
        setShowRejectModal(false);
        setReason("");
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An error occurred";
        toast.error(message);
      }
    });
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => handleAction("approve_head")}
        style={{
          padding: "0.35rem 0.75rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#ffffff",
          backgroundColor: "#10b981",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
        }}
      >
        {pending ? "..." : "Approve"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setShowRejectModal(true)}
        style={{
          padding: "0.35rem 0.75rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#ffffff",
          backgroundColor: "#ef4444",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
        }}
      >
        Reject
      </button>

      {showRejectModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#ffffff",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>
              Reject entry
            </h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional rejection reason"
              style={{
                width: "100%",
                height: "80px",
                padding: "0.5rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                marginBottom: "1rem",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction("reject_head", reason)}
                style={{
                  padding: "0.4rem 0.8rem",
                  backgroundColor: "#ef4444",
                  border: "none",
                  borderRadius: "0.375rem",
                  color: "#fff",
                }}
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
