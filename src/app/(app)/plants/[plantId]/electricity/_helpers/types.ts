export type ElectricityRow = {
  id: string;
  month: string;
  openingReading: string | number | null;
  closingReading: string | number | null;
  consumedUnits: string | number | null;
  billAmount: string | number;
  rentAmount: string | number;
  coveredAreaSqft?: string | number | null;
  rentRatePerSqft?: string | number | null;
  notes: string | null;
};
