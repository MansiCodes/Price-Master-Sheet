import type { ManpowerShift } from "@prisma/client";

/**
 * Credit score awards are disabled. Stubs keep existing API call sites compiling
 * without changing score or sending forms-complete WhatsApp.
 */

export async function maybeRevokeCreditScore(
  _userId: string,
  _plantId: string,
  _date: Date,
  _shift: ManpowerShift,
): Promise<{ revoked: boolean }> {
  return { revoked: false };
}

export async function maybeAwardCreditScore(
  _userId: string,
  _plantId: string,
  _date: Date,
  _shift?: ManpowerShift,
): Promise<{ awarded: boolean; whatsappSent?: boolean; newScore?: number }> {
  return { awarded: false };
}
