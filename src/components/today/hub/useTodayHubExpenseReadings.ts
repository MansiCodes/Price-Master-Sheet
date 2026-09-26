import { useState } from "react";

export function useTodayHubExpenseReadings() {
  const [expenseOpeningReading, setExpenseOpeningReading] = useState("");
  const [expenseClosingReading, setExpenseClosingReading] = useState("");
  const [expensePhotos, setExpensePhotos] = useState<string[]>([]);
  const [expenseRate, setExpenseRate] = useState("");
  const [expenseMonth, setExpenseMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rentCoveredArea, setRentCoveredArea] = useState("");
  const [rentRatePerSqft, setRentRatePerSqft] = useState("12");
  return {
    expenseOpeningReading,
    setExpenseOpeningReading,
    expenseClosingReading,
    setExpenseClosingReading,
    expensePhotos,
    setExpensePhotos,
    expenseRate,
    setExpenseRate,
    expenseMonth,
    setExpenseMonth,
    rentCoveredArea,
    setRentCoveredArea,
    rentRatePerSqft,
    setRentRatePerSqft,
  };
}
