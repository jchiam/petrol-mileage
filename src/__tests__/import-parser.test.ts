import { describe, expect, it } from 'vitest';

import {
  excelSerialToDate,
  findColumn,
  findHeaderRow,
  toDateString,
  toNumber,
} from '@/lib/import-parser';

// ─── excelSerialToDate ────────────────────────────────────────────────────────

describe('excelSerialToDate', () => {
  it('serial 1 → 1900-01-01', () => {
    expect(excelSerialToDate(1)).toBe('1900-01-01');
  });

  it('serial 59 → 1900-02-28', () => {
    // serial 60 = fictional Excel Feb 29, 1900; serial 59 = Feb 28
    expect(excelSerialToDate(59)).toBe('1900-02-28');
  });

  it('serial 61 → 1900-03-01 (post leap-year-bug shift)', () => {
    // Excel treats serial 60 as Feb 29 1900 (doesn't exist).
    // Serials > 60 are shifted by 1, so 61 → March 1 1900.
    expect(excelSerialToDate(61)).toBe('1900-03-01');
  });

  it('serial 45292 → 2024-01-01', () => {
    // Known spot-check: Jan 1 2024 in Excel serial
    expect(excelSerialToDate(45292)).toBe('2024-01-01');
  });
});

// ─── toDateString ─────────────────────────────────────────────────────────────

describe('toDateString', () => {
  it('null → ""', () => expect(toDateString(null)).toBe(''));
  it('empty string → ""', () => expect(toDateString('')).toBe(''));
  it('undefined → ""', () => expect(toDateString(undefined)).toBe(''));

  it('Date object → YYYY-MM-DD (uses local-time parts like exceljs)', () => {
    // new Date(y, m, d) creates midnight local time — getDate() always returns d regardless of TZ
    expect(toDateString(new Date(2024, 2, 10))).toBe('2024-03-10');
  });

  it('invalid Date → ""', () => {
    expect(toDateString(new Date('not-a-date'))).toBe('');
  });

  it('Excel serial (number) → YYYY-MM-DD', () => {
    // 45292 = 2024-01-01
    expect(toDateString(45292)).toBe('2024-01-01');
  });

  it('already YYYY-MM-DD passthrough', () => {
    expect(toDateString('2024-06-01')).toBe('2024-06-01');
  });

  it('DD/MM/YYYY → YYYY-MM-DD', () => {
    expect(toDateString('15/01/2024')).toBe('2024-01-15');
  });

  it('DD-MM-YYYY → YYYY-MM-DD', () => {
    expect(toDateString('15-01-2024')).toBe('2024-01-15');
  });

  it('garbage string → ""', () => {
    expect(toDateString('not-a-date-xyz')).toBe('');
  });
});

// ─── toNumber ─────────────────────────────────────────────────────────────────

describe('toNumber', () => {
  it('null → null', () => expect(toNumber(null)).toBeNull());
  it('undefined → null', () => expect(toNumber(undefined)).toBeNull());
  it('"" → null', () => expect(toNumber('')).toBeNull());
  it('"-" → null', () => expect(toNumber('-')).toBeNull());
  it('"#VALUE!" → null', () => expect(toNumber('#VALUE!')).toBeNull());
  it('"#N/A" → null (starts with #)', () => expect(toNumber('#N/A')).toBeNull());

  it('numeric string → number', () => {
    expect(toNumber('42.5')).toBeCloseTo(42.5);
  });

  it('string with commas → number', () => {
    expect(toNumber('1,234.56')).toBeCloseTo(1234.56);
  });

  it('number passthrough', () => {
    expect(toNumber(99.9)).toBeCloseTo(99.9);
  });

  it('non-numeric text → null', () => {
    expect(toNumber('abc')).toBeNull();
  });
});

// ─── findColumn ───────────────────────────────────────────────────────────────

describe('findColumn', () => {
  const headers = ['Pump Date', 'Petrol (L)', 'Mileage (km)', 'Cost'];

  it('exact match (case-insensitive)', () => {
    const result = findColumn(headers, ['pump date']);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(0);
    expect(result!.name).toBe('Pump Date');
  });

  it('partial match fallback', () => {
    // "mileage" should partial-match "Mileage (km)"
    const result = findColumn(headers, ['mileage']);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(2);
  });

  it('returns first alias match when multiple could match', () => {
    // aliases: ['cost (sgd)', 'cost'] — 'cost' exact-matches 'Cost' at index 3
    const result = findColumn(headers, ['cost (sgd)', 'cost']);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(3);
  });

  it('returns null when no alias matches', () => {
    const result = findColumn(headers, ['odometer reading', 'odo']);
    expect(result).toBeNull();
  });

  it('empty headers → null', () => {
    expect(findColumn([], ['cost'])).toBeNull();
  });
});

// ─── findHeaderRow ────────────────────────────────────────────────────────────

describe('findHeaderRow', () => {
  it('header on row 0', () => {
    const rows: unknown[][] = [
      ['Pump Date', 'Petrol (L)', 'Mileage (km)', 'Cost'],
      ['2024-01-01', '40', '500', '80'],
    ];
    const result = findHeaderRow(rows);
    expect(result).not.toBeNull();
    expect(result!.headerRowIndex).toBe(0);
  });

  it('header on row 1 (metadata row first)', () => {
    const rows: unknown[][] = [
      ['My Car — 2024 Fuel Log'],
      ['Pump Date', 'Petrol', 'Mileage', 'Cost'],
      ['2024-01-01', '40', '500', '80'],
    ];
    const result = findHeaderRow(rows);
    expect(result).not.toBeNull();
    expect(result!.headerRowIndex).toBe(1);
  });

  it('returns null when fewer than 2 key columns match', () => {
    const rows: unknown[][] = [
      ['Name', 'Address', 'Phone'],
      ['Alice', '123 St', '999'],
    ];
    expect(findHeaderRow(rows)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(findHeaderRow([])).toBeNull();
  });

  it('case-insensitive header detection', () => {
    const rows: unknown[][] = [['PUMP DATE', 'PETROL', 'MILEAGE', 'COST']];
    const result = findHeaderRow(rows);
    expect(result).not.toBeNull();
  });
});
