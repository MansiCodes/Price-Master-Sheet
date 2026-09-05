"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ApproveButtonProps = {
  statusId: string;
  action: "approve_head" | "approve_admin";
  label: string;
};

export function ApproveButton({ statusId, action, label }: ApproveButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/completion/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: statusId, action }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to approve shift");
        }
        toast.success(action === "approve_head" ? "Approved by Plant Head!" : "Approved by Super Admin!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      }
    });
  };

  return (
    <button
      type="button"
      className="btn btn-primary"
      style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem" }}
      disabled={pending}
      onClick={handleApprove}
    >
      {pending ? "Approving..." : label}
    </button>
  );
}
