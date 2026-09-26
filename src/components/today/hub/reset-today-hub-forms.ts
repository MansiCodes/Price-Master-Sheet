import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubPurchase } from "@/components/today/hub/useTodayHubPurchase";
import type { TodayHubSale } from "@/components/today/hub/useTodayHubSale";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import type { TodayHubExpense } from "@/components/today/hub/useTodayHubExpense";
import type { TodayHubMisc } from "@/components/today/hub/useTodayHubMisc";
import { resetTodayHubPurchase, resetTodayHubSale } from "@/components/today/hub/reset-today-hub-purchase-sale";
import { resetTodayHubStock } from "@/components/today/hub/reset-today-hub-stock";
import {
  resetTodayHubExpenseFields,
  resetTodayHubExpenseHead,
  resetTodayHubMiscPettyContact,
  resetTodayHubMiscProd,
} from "@/components/today/hub/reset-today-hub-expense-misc";

export function resetAllForms(args: {
  flags: TodayHubFlags;
  catalogs: TodayHubCatalogs;
  purchase: TodayHubPurchase;
  sale: TodayHubSale;
  stock: TodayHubStockState;
  expense: TodayHubExpense;
  misc: TodayHubMisc;
  plantCode: string;
  entryDate: string;
  today: string;
  setShift: (shift: "DAY" | "NIGHT") => void;
}) {
  const { flags, catalogs, purchase, sale, stock, expense, misc, plantCode, entryDate, today, setShift } = args;
  const { isCat6, isConductor, isQuad, isUpcast } = flags;
  resetTodayHubPurchase(purchase, isCat6);
  resetTodayHubSale(sale, catalogs, isCat6, isConductor);
  resetTodayHubStock(stock, catalogs, isQuad);
  setShift("DAY");
  resetTodayHubMiscProd(misc, catalogs);
  resetTodayHubExpenseHead(expense, isCat6, isUpcast, isQuad, plantCode);
  purchase.setPurchaseSource("vendor");
  resetTodayHubExpenseFields(expense, isCat6, entryDate, today);
  resetTodayHubMiscPettyContact(misc);
}
