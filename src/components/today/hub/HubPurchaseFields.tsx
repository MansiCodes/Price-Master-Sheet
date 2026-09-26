import { BillUpload } from "@/components/today/BillUpload";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import {
  HubPurchaseGstinField,
  HubPurchaseTypeOtherField,
  HubPurchaseTypeSourceRow,
} from "@/components/today/hub/HubPurchaseMetaFields";
import {
  HubPurchaseAtclChallan,
  HubPurchaseDefaultLineEditor,
  HubPurchaseQuadLineEditor,
  HubPurchaseRemarksField,
  HubPurchaseVendorBillRow,
  HubPurchaseVendorOther,
} from "@/components/today/hub/HubPurchaseVendorFields";

export function HubPurchaseFields({ vm }: { vm: TodayHubVm }) {
  return (
    <>
      <HubPurchaseTypeSourceRow vm={vm} />
      <HubPurchaseTypeOtherField vm={vm} />
      <HubPurchaseGstinField vm={vm} />
      <HubPurchaseQuadLineEditor vm={vm} />
      <HubPurchaseVendorBillRow vm={vm} />
      <HubPurchaseAtclChallan vm={vm} />
      <HubPurchaseVendorOther vm={vm} />
      <HubPurchaseDefaultLineEditor vm={vm} />
      <HubPurchaseRemarksField vm={vm} />
      <BillUpload urls={vm.purchase.billPhotos} onChange={vm.purchase.setBillPhotos} />
    </>
  );
}
