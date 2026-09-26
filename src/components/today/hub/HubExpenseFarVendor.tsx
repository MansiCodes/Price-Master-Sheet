import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpenseFarVendor({ vm }: { vm: TodayHubVm }) {
  const { farVendor, setFarVendor, farVendorOther, setFarVendorOther, farVendorOptions } =
    bindExpenseLocals(vm);
  return (
    <>
      <div className="field">
        <label htmlFor="far-vendor">Supplier Name</label>
        <SelectMenu id="far-vendor" value={farVendor} options={farVendorOptions} required onChange={setFarVendor} />
      </div>
      {farVendor === "Other" ? (
        <div className="field">
          <label htmlFor="far-vendor-other">
            Supplier (other) <span style={{ color: "red" }}>*</span>
          </label>
          <input
            id="far-vendor-other"
            value={farVendorOther}
            onChange={(e) => setFarVendorOther(e.target.value)}
            required
          />
        </div>
      ) : null}
    </>
  );
}
