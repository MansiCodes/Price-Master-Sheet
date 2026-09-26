import { BillUpload } from "@/components/today/BillUpload";
import { LineEditor } from "@/components/today/LineEditor";
import { PRODUCTS } from "@/components/today/today-hub-model";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import {
  HubSaleCustomerBlock,
  HubSaleCustomerOther,
  HubSaleTypeOther,
} from "@/components/today/hub/HubSaleCustomerFields";

function HubSaleInvoiceField({ vm }: { vm: TodayHubVm }) {
  const { invoiceNo, setInvoiceNo } = vm.sale;
  return (
    <div className="field">
      <label htmlFor="s-inv">{vm.flags.isCat6 ? "Bill Number" : "Invoice no."}</label>
      <input id="s-inv" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
    </div>
  );
}

function HubSaleLineEditor({ vm }: { vm: TodayHubVm }) {
  const { isCat6, isPvc, isConductor } = vm.flags;
  const { saleItemOptions, saleUnitOptions } = vm.catalogs;
  const { saleLines, setSaleLines } = vm.sale;
  return (
    <LineEditor
      lines={saleLines}
      onChange={setSaleLines}
      defaultUnit={isCat6 ? "NOS" : isPvc ? "KG" : PRODUCTS[0].unit}
      itemLabel={isConductor ? "Conductor size" : "Item Details"}
      itemOptions={saleItemOptions}
      itemPlaceholder={isConductor ? "Select conductor size" : undefined}
      unitOptions={saleUnitOptions}
      showCat6MeterFields={false}
      sizeQtyUnitRow={isConductor}
      rateLabel="Rate (per unit)"
      resolveUnitForItem={(name) => (isPvc ? "KG" : PRODUCTS.find((p) => p.name === name)?.unit)}
    />
  );
}

function HubSaleRemarksField({ vm }: { vm: TodayHubVm }) {
  const { saleRemarks, setSaleRemarks } = vm.sale;
  return (
    <div className="field field--wide">
      <label htmlFor="s-remarks">Remarks</label>
      <input
        id="s-remarks"
        value={saleRemarks}
        onChange={(e) => setSaleRemarks(e.target.value)}
        placeholder="Optional remarks"
      />
    </div>
  );
}

export function HubSaleFields({ vm }: { vm: TodayHubVm }) {
  return (
    <>
      <HubSaleCustomerBlock vm={vm} />
      <HubSaleCustomerOther vm={vm} />
      <HubSaleTypeOther vm={vm} />
      <HubSaleInvoiceField vm={vm} />
      <HubSaleLineEditor vm={vm} />
      <HubSaleRemarksField vm={vm} />
      <BillUpload label="Upload invoice" urls={vm.sale.invoicePhotos} onChange={vm.sale.setInvoicePhotos} />
    </>
  );
}
