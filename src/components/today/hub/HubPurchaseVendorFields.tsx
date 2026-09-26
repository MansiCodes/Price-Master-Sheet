import { LineEditor } from "@/components/today/LineEditor";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function HubPurchaseQuadLineEditor({ vm }: { vm: TodayHubVm }) {
  const { isQuad } = vm.flags;
  const { purchaseItemOptions, purchaseUnitOptions } = vm.catalogs;
  const { purchaseSource, purchaseLines, setPurchaseLines } = vm.purchase;
  if (!(isQuad && purchaseSource !== "atcl")) return null;
  return (
    <LineEditor
      lines={purchaseLines}
      onChange={setPurchaseLines}
      defaultUnit="KGS"
      itemLabel="Raw Material"
      itemOptions={purchaseItemOptions}
      itemPlaceholder="Select raw material"
      unitOptions={purchaseUnitOptions}
      showGst={true}
      showDebitQty={true}
      rateLabel="Rate (per unit)"
    />
  );
}

function HubPurchaseVendorSelect({ vm }: { vm: TodayHubVm }) {
  const { isCat6, isQuad } = vm.flags;
  const { vendorName, setVendorName, setVendorNameOther, purchaseSupplierOptions, quadSelectedMaterial } =
    vm.purchase;
  return (
    <div
      className="field"
      title={isQuad && !quadSelectedMaterial ? "First choose raw material" : undefined}
    >
      <label htmlFor="p-vendor">{isCat6 || isQuad ? "Vendor's Name" : "Supplier name"}</label>
      <SelectMenu
        id="p-vendor"
        value={vendorName}
        options={purchaseSupplierOptions}
        required
        disabled={isQuad && !quadSelectedMaterial}
        placeholder={isQuad && !quadSelectedMaterial ? "Select raw material first" : "Select supplier"}
        onChange={(next) => {
          setVendorName(next);
          if (next !== "Other") setVendorNameOther("");
        }}
      />
    </div>
  );
}

export function HubPurchaseVendorBillRow({ vm }: { vm: TodayHubVm }) {
  const { isCat6 } = vm.flags;
  const { purchaseSource, billNumber, setBillNumber } = vm.purchase;
  if (purchaseSource === "atcl") return null;
  return (
    <div className="form-grid two">
      <HubPurchaseVendorSelect vm={vm} />
      <div className="field">
        <label htmlFor="p-bill">{isCat6 ? "Bill Number" : "Invoice no. / Challan no."}</label>
        <input id="p-bill" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
      </div>
    </div>
  );
}

export function HubPurchaseAtclChallan({ vm }: { vm: TodayHubVm }) {
  const { purchaseSource, billNumber, setBillNumber } = vm.purchase;
  if (purchaseSource !== "atcl") return null;
  return (
    <div className="field">
      <label htmlFor="p-bill-atcl">Challan no.</label>
      <input id="p-bill-atcl" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
    </div>
  );
}

export function HubPurchaseVendorOther({ vm }: { vm: TodayHubVm }) {
  const { vendorName, vendorNameOther, setVendorNameOther } = vm.purchase;
  if (vendorName !== "Other") return null;
  return (
    <div className="field">
      <label htmlFor="p-vendor-other">
        Vendor&apos;s Name <span style={{ color: "red" }}>*</span>
      </label>
      <input
        id="p-vendor-other"
        required
        placeholder="Enter vendor name"
        value={vendorNameOther}
        onChange={(e) => setVendorNameOther(e.target.value)}
      />
    </div>
  );
}

export function HubPurchaseDefaultLineEditor({ vm }: { vm: TodayHubVm }) {
  const { isCat6, isQuad } = vm.flags;
  const { purchaseItemOptions, purchaseUnitOptions } = vm.catalogs;
  const { purchaseSource, purchaseLines, setPurchaseLines } = vm.purchase;
  if (!(!isQuad || purchaseSource === "atcl")) return null;
  return (
    <LineEditor
      lines={purchaseLines}
      onChange={setPurchaseLines}
      defaultUnit={isCat6 ? "NOS" : "KGS"}
      itemLabel={purchaseSource === "atcl" ? "Items Details" : isCat6 ? "Item Details" : "Description"}
      itemOptions={purchaseItemOptions}
      itemPlaceholder={isCat6 ? "Select item details" : "Select description"}
      unitOptions={purchaseUnitOptions}
      showGst={!isCat6 && purchaseSource !== "atcl"}
      showDebitQty={true}
      rateLabel="Rate (per unit)"
    />
  );
}

export function HubPurchaseRemarksField({ vm }: { vm: TodayHubVm }) {
  const { isCat6 } = vm.flags;
  const { purchaseRemarks, setPurchaseRemarks } = vm.purchase;
  return (
    <div className="field field--wide">
      <label htmlFor="p-remarks">{isCat6 ? "Notes" : "Remarks"}</label>
      <input
        id="p-remarks"
        value={purchaseRemarks}
        onChange={(e) => setPurchaseRemarks(e.target.value)}
        placeholder={isCat6 ? "Optional notes" : "Optional remarks"}
      />
    </div>
  );
}
