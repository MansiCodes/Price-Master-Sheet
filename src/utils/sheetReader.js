import { SheetColumns } from '../constants/index.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { AppError } from './AppError.js';
import { logger } from './logger.js';

/**
 * Trims a cell value to a string; empty/null becomes ''.
 * @param {*} value
 * @returns {string}
 */
export function trimCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Parses a price cell into a finite number.
 * @param {*} value
 * @param {number} rowNumber
 * @param {string} fieldName
 * @returns {number}
 */
export function parseRate(value, rowNumber, fieldName = 'price') {
  const raw = trimCell(value);

  if (!raw) {
    throw new AppError(
      `${Messages.RATE_PARSING_ERROR} (${fieldName}) at row ${rowNumber}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'RATE_PARSING_ERROR',
    );
  }

  const normalized = raw.replace(/[^0-9.\-]/g, '');
  const rate = Number.parseFloat(normalized);

  if (!Number.isFinite(rate)) {
    throw new AppError(
      `${Messages.RATE_PARSING_ERROR} (${fieldName}) at row ${rowNumber}: "${raw}"`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'RATE_PARSING_ERROR',
    );
  }

  return rate;
}

/**
 * Detects the header row (NAME OF CABLE / P=10% ...).
 * @param {string[]} row
 * @returns {boolean}
 */
function isHeaderRow(row) {
  const joined = (row || []).map((cell) => trimCell(cell).toLowerCase()).join(' | ');
  const name = trimCell(row[SheetColumns.NAME]).toLowerCase();
  const sNo = trimCell(row[SheetColumns.S_NO]).toLowerCase();

  return (
    name.includes('name of cable')
    || name === 'name'
    || (name.includes('cable') && name.includes('name'))
    || joined.includes('p=10')
    || joined.includes('p=12')
    || sNo === 's no.'
    || sNo === 's no'
    || sNo === 'sno'
  );
}

/**
 * @param {string[]} row
 * @returns {boolean}
 */
function isEmptyRow(row) {
  const name = trimCell(row[SheetColumns.NAME]);
  const p10 = trimCell(row[SheetColumns.P10]);
  const p12 = trimCell(row[SheetColumns.P12]);
  const p15 = trimCell(row[SheetColumns.P15]);
  const p20 = trimCell(row[SheetColumns.P20]);
  return !name && !p10 && !p12 && !p15 && !p20;
}

/**
 * @param {*} value
 * @returns {number|null}
 */
function parseSerial(value) {
  const raw = trimCell(value);
  if (!raw) {
    return null;
  }
  const num = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(num) ? num : null;
}

/**
 * Shortens a long DESCRIPTION cell for UI display.
 * @param {*} value
 * @param {number} [maxLen=88]
 * @returns {{ short: string, full: string }}
 */
export function shortenSpecification(value, maxLen = 88) {
  const full = trimCell(value);
  if (!full) {
    return { short: '', full: '' };
  }

  if (full.length <= maxLen) {
    return { short: full, full };
  }

  const slice = full.slice(0, maxLen);
  const lastComma = slice.lastIndexOf(',');
  const cutAt = lastComma > Math.floor(maxLen * 0.45) ? lastComma : maxLen;
  return {
    short: `${slice.slice(0, cutAt).trim()}…`,
    full,
  };
}

/**
 * Transforms raw Google Sheets rows into CableRate domain objects.
 * Reads: B = name, C = description, I/J/K/L = P=10/12/15/20%.
 *
 * @param {Array<Array<*>>|undefined|null} rows
 * @returns {import('../types/rate.types.js').CableRate[]}
 */
export function mapSheetRowsToRates(rows) {
  if (!rows || rows.length === 0) {
    throw new AppError(Messages.EMPTY_DATA, HttpStatus.NOT_FOUND, 'EMPTY_DATA');
  }

  /** @type {import('../types/rate.types.js').CableRate[]} */
  const rates = [];
  let headerSeen = false;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const rowNumber = i + 1;

    if (isEmptyRow(row)) {
      continue;
    }

    if (!headerSeen && isHeaderRow(row)) {
      headerSeen = true;
      continue;
    }

    if (!headerSeen) {
      continue;
    }

    const name = trimCell(row[SheetColumns.NAME]);
    if (!name) {
      continue;
    }

    try {
      const p10 = parseRate(row[SheetColumns.P10], rowNumber, 'P=10%');
      const p12 = parseRate(row[SheetColumns.P12], rowNumber, 'P=12%');
      const p15 = parseRate(row[SheetColumns.P15], rowNumber, 'P=15%');
      const p20 = parseRate(row[SheetColumns.P20], rowNumber, 'P=20%');
      const { short, full } = shortenSpecification(row[SheetColumns.DESCRIPTION]);

      rates.push({
        sNo: parseSerial(row[SheetColumns.S_NO]),
        name,
        specification: short,
        specificationFull: full,
        p10,
        p12,
        p15,
        p20,
      });
    } catch (error) {
      logger.warn('Skipping row with invalid price data', {
        rowNumber,
        name,
        reason: error.message,
      });
    }
  }

  if (rates.length === 0) {
    throw new AppError(Messages.EMPTY_DATA, HttpStatus.NOT_FOUND, 'EMPTY_DATA');
  }

  return rates;
}

/**
 * Ensures the sheet has enough columns for name + P=10/12/15/20.
 * @param {Array<Array<*>>|undefined|null} rows
 */
export function assertSheetStructure(rows) {
  if (!rows || rows.length === 0) {
    throw new AppError(Messages.EMPTY_DATA, HttpStatus.NOT_FOUND, 'EMPTY_DATA');
  }

  const headerRow = rows.find((row) => isHeaderRow(row ?? []));
  const probeRow = headerRow || rows.find((row) => !isEmptyRow(row ?? []));

  if (!probeRow) {
    throw new AppError(Messages.EMPTY_DATA, HttpStatus.NOT_FOUND, 'EMPTY_DATA');
  }

  // Need columns through L (index 11) for P=20%
  if (probeRow.length < SheetColumns.P20 + 1) {
    throw new AppError(
      Messages.INVALID_COLUMNS,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INVALID_COLUMNS',
    );
  }
}
