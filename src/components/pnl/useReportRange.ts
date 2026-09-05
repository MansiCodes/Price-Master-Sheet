"use client";

import { useState } from "react";
import { toISODate } from "@/components/pnl/types";

export function useReportRange(initialFrom?: string, initialTo?: string) {
  const today = toISODate(new Date());
  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");

  return { from, to, setFrom, setTo, today };
}
