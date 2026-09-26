export type AssemblePlant = { id: string; name: string; code: string };
export type AssembleStatusRow = {
  plantId: string;
  shift: string;
  purchaseFilled: boolean;
  saleFilled: boolean;
  stockFilled: boolean;
  productionFilled: boolean;
  pettyCashFilled: boolean;
  allComplete: boolean;
};
export type AssembleGroupCount = {
  plantId?: string;
  date: Date;
  shift: string;
  _count: number;
};
export type AssembleShiftCount = { shift: string; _count: number };
