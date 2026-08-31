"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ApproveRejectGroupProps = {
  statusId: string;
  role: "BUSINESS_HEAD" | "SUPER_ADMIN" | string;
};

export function ApproveRejectGroup({ statusId, role }: ApproveRejectGroupProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");

  const isHead = role === "BUSINESS_HEAD";
  const actionApprove = isHead ? "approve_head" : "approve_admin";
  const actionReject = isHead ? "reject_head" : "reject_admin";

  const handleAction = (action: string, rejectReason?: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/completion/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: statusId, action, reason: rejectReason }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to process request");
        }
        
        let msg = "";
        if (action === "approve_head") msg = "Shift approved by Business Head!";
        else if (action === "approve_admin") msg = "Shift approved by Super Admin!";
        else if (action === "reject_head") msg = "Shift rejected by Business Head!";
        else if (action === "reject_admin") msg = "Shift rejected by Super Admin!";

        toast.success(msg);
        setShowRejectModal(false);
        setReason("");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      }
    });
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => handleAction(actionApprove)}
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
        {pending ? "Processing..." : "Approve"}
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

      {showRejectModal && (
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
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>Reject Shift Entry</h3>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#4b5563", marginBottom: "0.5rem" }}>
              Rejection Reason (Optional):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rate for 1.5 Meters CAT6 Patch Cord is incorrect."
              style={{
                width: "100%",
                height: "80px",
                padding: "0.5rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
                resize: "none",
                marginBottom: "1rem",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction(actionReject, reason)}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#ef4444",
                  border: "none",
                  borderRadius: "0.375rem",
                  color: "#ffffff",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
