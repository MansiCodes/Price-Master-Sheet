import { useState } from "react";

export function useTodayHubMiscPetty() {
  const [pettyCashPayMode, setPettyCashPayMode] = useState("");
  const [pettyCashDescription, setPettyCashDescription] = useState("");
  const [pettyCashBillNumber, setPettyCashBillNumber] = useState("");
  const [pettyCashExpense, setPettyCashExpense] = useState("");
  const [pettyCashContractorSalary, setPettyCashContractorSalary] = useState("");
  const [pettyCashSupervisorSalary, setPettyCashSupervisorSalary] = useState("");
  const [pettyCashPhotos, setPettyCashPhotos] = useState<string[]>([]);
  return {
    pettyCashPayMode, setPettyCashPayMode,
    pettyCashDescription, setPettyCashDescription,
    pettyCashBillNumber, setPettyCashBillNumber,
    pettyCashExpense, setPettyCashExpense,
    pettyCashContractorSalary, setPettyCashContractorSalary,
    pettyCashSupervisorSalary, setPettyCashSupervisorSalary,
    pettyCashPhotos, setPettyCashPhotos,
  };
}
