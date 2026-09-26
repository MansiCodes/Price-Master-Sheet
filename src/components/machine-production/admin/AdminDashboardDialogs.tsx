"use client";

import { DeleteConfirmDialog } from "@/components/pnl/DeleteConfirmDialog";
import type {
  CableSizeRow,
  CableTypeRow,
  MachineRow,
  PendingDelete,
  ProcessRow,
} from "@/components/machine-production/admin-dashboard-model";

type Props = {
  pendingDelete: PendingDelete | null;
  deleting: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  pendingToggleMachine: { machine: MachineRow; nextActive: boolean } | null;
  togglingMachine: boolean;
  onCloseToggleMachine: () => void;
  onConfirmToggleMachine: () => void;
  pendingToggleProcess: { process: ProcessRow; nextActive: boolean } | null;
  togglingProcess: boolean;
  onCloseToggleProcess: () => void;
  onConfirmToggleProcess: () => void;
  pendingToggleCableType: { type: CableTypeRow; nextActive: boolean } | null;
  togglingCableType: boolean;
  onCloseToggleCableType: () => void;
  onConfirmToggleCableType: () => void;
  pendingToggleCableSize: { size: CableSizeRow; nextActive: boolean } | null;
  togglingCableSize: boolean;
  onCloseToggleCableSize: () => void;
  onConfirmToggleCableSize: () => void;
};

export function AdminDashboardDialogs({
  pendingDelete,
  deleting,
  onCloseDelete,
  onConfirmDelete,
  pendingToggleMachine,
  togglingMachine,
  onCloseToggleMachine,
  onConfirmToggleMachine,
  pendingToggleProcess,
  togglingProcess,
  onCloseToggleProcess,
  onConfirmToggleProcess,
  pendingToggleCableType,
  togglingCableType,
  onCloseToggleCableType,
  onConfirmToggleCableType,
  pendingToggleCableSize,
  togglingCableSize,
  onCloseToggleCableSize,
  onConfirmToggleCableSize,
}: Props) {
  return (
    <>
      <DeleteConfirmDialog
        open={Boolean(pendingDelete)}
        deleting={deleting}
        onNo={onCloseDelete}
        onYes={onConfirmDelete}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleMachine)}
        deleting={togglingMachine}
        title={
          pendingToggleMachine?.nextActive
            ? "Activate machine?"
            : "Deactivate machine?"
        }
        message={
          pendingToggleMachine?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={pendingToggleMachine?.nextActive ? "Activate" : "Deactivate"}
        onNo={onCloseToggleMachine}
        onYes={onConfirmToggleMachine}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleProcess)}
        deleting={togglingProcess}
        title={
          pendingToggleProcess?.nextActive
            ? "Activate process?"
            : "Deactivate process?"
        }
        message={
          pendingToggleProcess?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={pendingToggleProcess?.nextActive ? "Activate" : "Deactivate"}
        onNo={onCloseToggleProcess}
        onYes={onConfirmToggleProcess}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleCableType)}
        deleting={togglingCableType}
        title={
          pendingToggleCableType?.nextActive
            ? "Activate cable type?"
            : "Deactivate cable type?"
        }
        message={
          pendingToggleCableType?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={
          pendingToggleCableType?.nextActive ? "Activate" : "Deactivate"
        }
        onNo={onCloseToggleCableType}
        onYes={onConfirmToggleCableType}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleCableSize)}
        deleting={togglingCableSize}
        title={
          pendingToggleCableSize?.nextActive
            ? "Activate cable size?"
            : "Deactivate cable size?"
        }
        message={
          pendingToggleCableSize?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={
          pendingToggleCableSize?.nextActive ? "Activate" : "Deactivate"
        }
        onNo={onCloseToggleCableSize}
        onYes={onConfirmToggleCableSize}
      />
    </>
  );
}
