export { HttpStatus } from './httpStatus.js';
export { Messages } from './messages.js';
export { CacheKeys } from './cacheKeys.js';

/** Default workbook tab name (override with GOOGLE_SHEET_NAME) */
export const SHEET_NAME = 'Master List';

/**
 * Column indexes (0-based) matching the live workbook:
 * A=S NO, B=NAME OF CABLE, C=DESCRIPTION, D=Tab, E=Hyperlink,
 * F=RM Costing, G=RM Costing Per Mtr, H=RM Costing Per Box,
 * I=P=10%, J=P=12%, K=P=15%, L=P=20%
 */
export const SheetColumns = Object.freeze({
  S_NO: 0,
  NAME: 1,
  DESCRIPTION: 2,
  TAB: 3,
  HYPERLINK: 4,
  RM_COSTING: 5,
  RM_PER_MTR: 6,
  RM_PER_BOX: 7,
  P10: 8,
  P12: 9,
  P15: 10,
  P20: 11,
});

export const API_PREFIX = '/api/v1';
