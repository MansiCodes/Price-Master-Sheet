export type StockProcessLine = {
  name: string;
  shortName: string;
  closing: number;
  production: number;
};

export type CallPutupItem = {
  id?: string;
  qty: number | string;
  date?: string;
  partyName?: string;
};

export type DispatchPendingItem = {
  id?: string;
  qty: number | string;
  partyName?: string;
};

export type CableStockStatusBlock = {
  key: string;
  cable: string;
  size: string;
  entryDate: string;
  processes: StockProcessLine[];
  totalKm: number;
  salesKm: number;
  /** Put-up km total from Call putup. */
  putupKm: number;
  callPutup: string;
  putupDate: string;
  partyName: string;
  dispatchParty: string;
  dispatchPending: number;
  userNotes: string;
  callPutupItems?: Array<{
    qty: number;
    callPutup: string;
    putupDate: string;
    partyName: string;
  }>;
  dispatchPendingItems?: Array<{
    qty: number;
    dispatchParty: string;
  }>;
};

/** Signalling shared Insulation pool (one card for all sizes). */
export type SharedInsulationStatus = {
  entryDate: string;
  opening: number;
  production: number;
  consumed: number;
  closing: number;
};

export type FormattedStatusItem = {
  label: string;
  value: string;
};

export type CallPutupStatusItem = {
  id: string;
  qty: number;
  callPutup: string;
  putupDate: string;
  partyName: string;
  label: string;
  value: string;
};

export type DispatchPendingStatusItem = {
  id: string;
  qty: number;
  dispatchParty: string;
  label: string;
  value: string;
};

export type RawMaterialStockRow = {
  item: string;
  qty: number | null;
  unit: string | null;
  rate: number | null;
  value: number | null;
  entryDate: string | null;
  hasData: boolean;
};
