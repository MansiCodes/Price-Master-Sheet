import { useState } from "react";

export function useTodayHubCustomCatalogs() {
  const [customSuppliers, setCustomSuppliers] = useState<string[]>([]);
  const [customCustomers, setCustomCustomers] = useState<string[]>([]);
  const [customPurchaseItems, setCustomPurchaseItems] = useState<string[]>([]);
  const [customSaleItems, setCustomSaleItems] = useState<string[]>([]);
  const [customStockItems, setCustomStockItems] = useState<string[]>([]);
  const [customFarVendors, setCustomFarVendors] = useState<string[]>([]);
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  return {
    customSuppliers,
    setCustomSuppliers,
    customCustomers,
    setCustomCustomers,
    customPurchaseItems,
    setCustomPurchaseItems,
    customSaleItems,
    setCustomSaleItems,
    customStockItems,
    setCustomStockItems,
    customFarVendors,
    setCustomFarVendors,
    customUnits,
    setCustomUnits,
  };
}
