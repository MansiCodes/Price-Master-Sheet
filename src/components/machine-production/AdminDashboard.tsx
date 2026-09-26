"use client";

import { AdminDashboardFilters } from "@/components/machine-production/AdminDashboardFilters";
import { AdminCablePanel } from "@/components/machine-production/admin/AdminCablePanel";
import { AdminDashboardDialogs } from "@/components/machine-production/admin/AdminDashboardDialogs";
import { AdminEntryDetail } from "@/components/machine-production/admin/AdminEntryDetail";
import { AdminMachinesPanel } from "@/components/machine-production/admin/AdminMachinesPanel";
import { AdminProcessesPanel } from "@/components/machine-production/admin/AdminProcessesPanel";
import { AdminRecordsPanel } from "@/components/machine-production/admin/AdminRecordsPanel";
import { AdminSummaryCounts } from "@/components/machine-production/admin/AdminSummaryCounts";
import { useAdminDashboard } from "@/components/machine-production/useAdminDashboard";
import type { AdminTab } from "@/components/machine-production/admin-dashboard-model";
import "@/components/pnl/pnl-reports.css";
import "@/components/machine-production/machine-production.css";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "records", label: "Production records" },
  { id: "machines", label: "Machines" },
  { id: "processes", label: "Processes" },
  { id: "cable", label: "Cable type & size" },
];

export function AdminDashboard() {
  const {
    tab,
    setTab,
    displaySummary,
    records,
    machines,
    processes,
    cable,
    pendingDelete,
    setPendingDelete,
    deleting,
    confirmDelete,
  } = useAdminDashboard();

  return (
    <div className="mp-root">
      <div className="mp-admin-top">
        <div className="mp-shift-tabs mp-shift-tabs--admin">
          {TABS.map((t) => (
          <button
              key={t.id}
            type="button"
            className={
                tab === t.id
                ? "mp-shift-tab mp-shift-tab--active"
                : "mp-shift-tab"
            }
              onClick={() => setTab(t.id)}
          >
              {t.label}
          </button>
          ))}
        </div>
        {tab === "records" && displaySummary ? (
          <AdminSummaryCounts summary={displaySummary} />
        ) : null}
      </div>

      {tab === "records" ? (
        <>
          <AdminDashboardFilters
            filters={records.filters}
            machines={machines.machines}
            todayYmd={records.todayYmd}
            filtersDirty={records.filtersDirty}
            loading={records.loading}
            entriesTotal={records.entriesTotal}
            onPatchFilters={records.patchFilters}
            onDownloadPdf={() => void records.downloadRecordsPdf()}
          />
          <AdminRecordsPanel
            loading={records.loading}
            recordsByDate={records.recordsByDate}
            todayYmd={records.todayYmd}
            expandedMachineDays={records.expandedMachineDays}
            setExpandedMachineDays={records.setExpandedMachineDays}
            entriesPage={records.entriesPage}
            entriesPageSize={records.entriesPageSize}
            entriesTotal={records.entriesTotal}
            setEntriesPage={records.setEntriesPage}
            setEntriesPageSize={records.setEntriesPageSize}
            onSelect={records.setSelected}
            onEdit={records.openEntryEdit}
            onDelete={(id) => setPendingDelete({ kind: "entry", id })}
          />
        </>
      ) : tab === "machines" ? (
        <AdminMachinesPanel
          machineForm={machines.machineForm}
          setMachineForm={machines.setMachineForm}
          editingId={machines.editingId}
          machineSaving={machines.machineSaving}
          onSave={machines.saveMachine}
          onReset={machines.resetMachineForm}
          machinesTableLoading={machines.machinesTableLoading}
          machinesTable={machines.machinesTable}
          machinesPage={machines.machinesPage}
          machinesPageSize={machines.machinesPageSize}
          machinesTotal={machines.machinesTotal}
          setMachinesPage={machines.setMachinesPage}
          setMachinesPageSize={machines.setMachinesPageSize}
          onEdit={machines.startEditMachine}
          onDelete={(id) => setPendingDelete({ kind: "machine", id })}
          onToggle={(m) =>
            machines.setPendingToggleMachine({
                                  machine: m,
                                  nextActive: !m.isActive,
            })
          }
        />
      ) : tab === "processes" ? (
        <AdminProcessesPanel
          machines={machines.machines}
          processForm={processes.processForm}
          setProcessForm={processes.setProcessForm}
          editingProcessId={processes.editingProcessId}
          processSaving={processes.processSaving}
          processMachineIds={processes.processMachineIds}
          setProcessMachineIds={processes.setProcessMachineIds}
          onSave={processes.saveProcess}
          onReset={processes.resetProcessForm}
          processesTableLoading={processes.processesTableLoading}
          processesTable={processes.processesTable}
          processes={processes.processes}
          processesPage={processes.processesPage}
          processesPageSize={processes.processesPageSize}
          processesTotal={processes.processesTotal}
          setProcessesPage={processes.setProcessesPage}
          setProcessesPageSize={processes.setProcessesPageSize}
          onMove={processes.moveProcess}
          onEdit={processes.editProcess}
          onDelete={(id) => setPendingDelete({ kind: "process", id })}
          onToggle={(p) =>
            processes.setPendingToggleProcess({
                                    process: p,
                                    nextActive: !p.isActive,
            })
          }
        />
      ) : (
        <AdminCablePanel
          processes={processes.processes}
          cableProcessId={cable.cableProcessId}
          setCableProcessId={cable.setCableProcessId}
          cableMachineId={cable.cableMachineId}
          setCableMachineId={cable.setCableMachineId}
          cableMachinesForProcess={cable.cableMachinesForProcess}
          cableMachineHint={cable.cableMachineHint}
          cableTypeHint={cable.cableTypeHint}
          cableSizeHint={cable.cableSizeHint}
          editingCableTypeId={cable.editingCableTypeId}
          setEditingCableTypeId={cable.setEditingCableTypeId}
          cableTypeForm={cable.cableTypeForm}
          setCableTypeForm={cable.setCableTypeForm}
          saveCableType={cable.saveCableType}
          addOthersCableType={cable.addOthersCableType}
          cableTypes={cable.cableTypes}
          selectedCableTypeId={cable.selectedCableTypeId}
          setSelectedCableTypeId={cable.setSelectedCableTypeId}
          setPendingToggleCableType={cable.setPendingToggleCableType}
          editingCableSizeId={cable.editingCableSizeId}
          setEditingCableSizeId={cable.setEditingCableSizeId}
          cableSizeForm={cable.cableSizeForm}
          setCableSizeForm={cable.setCableSizeForm}
          saveCableSize={cable.saveCableSize}
          addOthersCableSize={cable.addOthersCableSize}
          cableSizes={cable.cableSizes}
          setPendingToggleCableSize={cable.setPendingToggleCableSize}
          onDeleteType={(id) => setPendingDelete({ kind: "cableType", id })}
          onDeleteSize={(id) => setPendingDelete({ kind: "cableSize", id })}
        />
      )}

      <AdminEntryDetail
        selected={records.selected}
        onClose={() => records.setSelected(null)}
        onEdit={records.openEntryEdit}
        onDelete={(id) => setPendingDelete({ kind: "entry", id })}
        editingEntry={records.editingEntry}
        entryEditValues={records.entryEditValues}
        entrySaving={records.entrySaving}
        entryEditError={records.entryEditError}
        onChangeField={(name, value) =>
          records.setEntryEditValues((prev) => ({ ...prev, [name]: value }))
        }
        onCloseEdit={records.closeEntryEdit}
        onSaveEdit={records.saveEntryEdit}
      />

      <AdminDashboardDialogs
        pendingDelete={pendingDelete}
        deleting={deleting}
        onCloseDelete={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirmDelete={() => void confirmDelete()}
        pendingToggleMachine={machines.pendingToggleMachine}
        togglingMachine={machines.togglingMachine}
        onCloseToggleMachine={() => {
          if (!machines.togglingMachine) machines.setPendingToggleMachine(null);
        }}
        onConfirmToggleMachine={() => void machines.confirmToggleMachine()}
        pendingToggleProcess={processes.pendingToggleProcess}
        togglingProcess={processes.togglingProcess}
        onCloseToggleProcess={() => {
          if (!processes.togglingProcess) {
            processes.setPendingToggleProcess(null);
          }
        }}
        onConfirmToggleProcess={() => void processes.confirmToggleProcess()}
        pendingToggleCableType={cable.pendingToggleCableType}
        togglingCableType={cable.togglingCableType}
        onCloseToggleCableType={() => {
          if (!cable.togglingCableType) cable.setPendingToggleCableType(null);
        }}
        onConfirmToggleCableType={() => void cable.confirmToggleCableType()}
        pendingToggleCableSize={cable.pendingToggleCableSize}
        togglingCableSize={cable.togglingCableSize}
        onCloseToggleCableSize={() => {
          if (!cable.togglingCableSize) cable.setPendingToggleCableSize(null);
        }}
        onConfirmToggleCableSize={() => void cable.confirmToggleCableSize()}
      />
    </div>
  );
}
