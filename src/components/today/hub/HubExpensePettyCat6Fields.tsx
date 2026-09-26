import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { BillUpload } from "@/components/today/BillUpload";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpensePettyCat6Amount({ vm }: { vm: TodayHubVm }) {
  const { pettyCashExpense, setPettyCashExpense, pettyNature, setPettyNature, pettyCatalog } =
    bindExpenseLocals(vm);
  return (
    <>
      <div className="field">
        <label htmlFor="pc-amount">Output Amt</label>
        <DecimalInput id="pc-amount" required value={pettyCashExpense} onChange={setPettyCashExpense} />
      </div>
      <div className="field">
        <label htmlFor="pc-nature">Nature of Expense</label>
        <SelectMenu
          id="pc-nature"
          value={pettyNature}
          options={pettyCatalog.natures}
          required
          placeholder="Select nature"
          onChange={setPettyNature}
        />
      </div>
    </>
  );
}

export function HubExpensePettyCat6Desc({ vm }: { vm: TodayHubVm }) {
  const { pettyCashDescription, setPettyCashDescription } = bindExpenseLocals(vm);
  return (
    <div className="field expense-desc">
      <label htmlFor="pc-description">Expense Description</label>
      <textarea
        id="pc-description"
        required
        value={pettyCashDescription}
        onChange={(e) => setPettyCashDescription(e.target.value)}
        rows={4}
      />
    </div>
  );
}

export function HubExpensePettyCat6People({ vm }: { vm: TodayHubVm }) {
  const { pettyPerson, setPettyPerson, pettyLocation, setPettyLocation, pettyCatalog } =
    bindExpenseLocals(vm);
  return (
    <div className="form-grid two">
      <div className="field">
        <label htmlFor="pc-person">Person</label>
        <SelectMenu
          id="pc-person"
          value={pettyPerson}
          options={pettyCatalog.persons}
          required
          placeholder="Select person"
          onChange={setPettyPerson}
        />
      </div>
      <div className="field">
        <label htmlFor="pc-location">Location</label>
        <SelectMenu
          id="pc-location"
          value={pettyLocation}
          options={pettyCatalog.locations}
          placeholder="Select location"
          onChange={setPettyLocation}
        />
      </div>
    </div>
  );
}

export function HubExpensePettyCat6Approvals({ vm }: { vm: TodayHubVm }) {
  const { pettyCheckedBy, setPettyCheckedBy, pettyApprovedBy, setPettyApprovedBy, pettyCatalog } =
    bindExpenseLocals(vm);
  return (
    <div className="form-grid two">
      <div className="field">
        <label htmlFor="pc-checked">Check by</label>
        <SelectMenu id="pc-checked" value={pettyCheckedBy} options={pettyCatalog.checkedBy} placeholder="Select checker" onChange={setPettyCheckedBy} />
      </div>
      <div className="field">
        <label htmlFor="pc-approved">Approved By</label>
        <SelectMenu id="pc-approved" value={pettyApprovedBy} options={pettyCatalog.approvedBy} placeholder="Select approver" onChange={setPettyApprovedBy} />
      </div>
    </div>
  );
}

export function HubExpensePettyCat6Upload({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { pettyCashPhotos, setPettyCashPhotos } = bindExpenseLocals(vm);
  return <BillUpload label={t("uploadBill")} urls={pettyCashPhotos} onChange={setPettyCashPhotos} />;
}
