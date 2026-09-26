import { PVC_FAR_DEP_PERCENT, PVC_UNLOADING_RATE_PER_MT } from "@/lib/plant-catalogs";
import { PRODUCTS } from "@/components/today/today-hub-model";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubExpense } from "@/components/today/hub/useTodayHubExpense";
import type { TodayHubMisc } from "@/components/today/hub/useTodayHubMisc";

export function resetTodayHubExpenseHead(
  expense: TodayHubExpense,
  isCat6: boolean,
  isUpcast: boolean,
  isQuad: boolean,
  plantCode: string,
) {
  expense.setExpenseSection(isCat6 ? "indirect" : "direct");
  expense.setExpenseHead(
    isCat6
      ? "Miscellaneous"
      : isUpcast ||
          plantCode.toUpperCase() === "LEDROPE" ||
          plantCode.toUpperCase() === "SLSSL" ||
          isQuad
        ? "Electricity"
        : "Fuel & Power",
  );
}

export function resetTodayHubExpenseFields(
  expense: TodayHubExpense,
  isCat6: boolean,
  entryDate: string,
  today: string,
) {
  expense.setExpenseAmount("");
  expense.setPaidTo("");
  expense.setExpenseDesc(isCat6 ? "Salary" : "");
  expense.setExpenseOpeningReading("");
  expense.setExpenseClosingReading("");
  expense.setExpenseRate("");
  expense.setExpensePhotos([]);
  expense.setExpenseMonth(entryDate.slice(0, 7) || today.slice(0, 7));
  expense.setRentCoveredArea("");
  expense.setRentRatePerSqft("12");
  expense.setFarVendor("");
  expense.setFarVendorOther("");
  expense.setFarDescription("");
  expense.setFarBillNumber("");
  expense.setFarCost("");
  expense.setFarDepPercent(String(PVC_FAR_DEP_PERCENT));
  expense.setUnloadQtyMt("");
  expense.setUnloadRatePerMt(String(PVC_UNLOADING_RATE_PER_MT));
}

export function resetTodayHubMiscProd(misc: TodayHubMisc, catalogs: TodayHubCatalogs) {
  const { saleProducts } = catalogs;
  misc.setProductName(saleProducts[0] ?? PRODUCTS[0].name);
  misc.setProdQty("");
  misc.setProdUnit(PRODUCTS[0].unit);
  misc.setMgr("1");
  misc.setOps("8");
  misc.setHelpers("4");
}

export function resetTodayHubMiscPettyContact(misc: TodayHubMisc) {
  misc.setPettyCashPayMode("");
  misc.setPettyCashDescription("");
  misc.setPettyCashBillNumber("");
  misc.setPettyCashExpense("");
  misc.setPettyCashContractorSalary("");
  misc.setPettyCashSupervisorSalary("");
  misc.setPettyCashPhotos([]);
  misc.setPettyNature("");
  misc.setPettyPerson("");
  misc.setPettyLocation("");
  misc.setPettyCheckedBy("");
  misc.setPettyApprovedBy("");
  misc.setContactName("");
  misc.setContactPhone("");
  misc.setContactCategory("");
  misc.setContactDesignation("");
}
