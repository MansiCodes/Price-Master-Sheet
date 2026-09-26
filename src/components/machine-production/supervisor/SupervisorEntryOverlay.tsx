import {
  ProductionEntryForm,
  type MachineCard,
  type SlotInfo,
} from "@/components/machine-production/ProductionEntryForm";

export function SupervisorEntryOverlay({
  open,
  machine,
  viewSlot,
  processName,
  onClose,
  onSaved,
}: {
  open: boolean;
  machine: MachineCard | null;
  viewSlot: SlotInfo | null;
  processName: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <ProductionEntryForm
      open={open}
      machine={machine}
      viewSlot={viewSlot}
      processName={processName}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
