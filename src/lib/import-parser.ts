/**
 * Import parser for petrol tracker Excel/CSV files.
 *
 * Handles quirks from the 4 known source files:
 * - Auto-detects the data sheet by looking for header row with Pump Date / Petrol / Mileage / Cost
 * - Skips rows where petrol is '-' or '#VALUE!' (GrabHitch rows)
 * - Prefers "Cost" column over "Net Cost" column
 * - Handles both Excel date serials (numbers) and string dates
 * - First data row may contain junk — surfaced in preview so user can deselect
 */

import ExcelJS from 'exceljs'
import { Readable } from 'stream'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ParsedRow {
  /** Original 0-based row index within the sheet (for stable keys) */
  sheetRow: number
  pump_date: string       // YYYY-MM-DD or '' if unparseable
  petrol_l: number | null
  mileage_km: number | null
  cost: number | null
  /** True when the row has a valid date, positive petrol/mileage/cost */
  valid: boolean
  /** Human-readable reason when valid=false */
  invalidReason?: string
}

export interface ParseResult {
  sheetName: string
  rows: ParsedRow[]
  /** Column names found (for debug / fallback UI) */
  detectedColumns: {
    pumpDate: string
    petrolL: string
    mileageKm: string
    cost: string
  }
}

export interface ParseError {
  error: string
}

export type ParseOutcome = ParseResult | ParseError

// ─── Column name aliases ──────────────────────────────────────────────────────

const PUMP_DATE_ALIASES = ['pump date', 'date', 'fill date', 'filldate']
const PETROL_ALIASES    = ['petrol (l)', 'petrol(l)', 'petrol', 'litres', 'liters', 'volume (l)', 'volume']
const MILEAGE_ALIASES   = ['mileage (km)', 'mileage(km)', 'mileage', 'odometer', 'km']
// Prefer exact "cost" before "net cost"
const COST_ALIASES      = ['cost (sgd)', 'cost(sgd)', 'cost', 'amount', 'total']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Find a column in the header row by alias list.
 * Returns the original header string (for reporting) and its 0-based index,
 * or null if not found.
 */
function findColumn(
  headers: string[],
  aliases: string[],
): { name: string; index: number } | null {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => normalise(h) === alias)
    if (idx !== -1) return { name: headers[idx], index: idx }
  }
  // Partial match fallback
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => normalise(h).includes(alias))
    if (idx !== -1) return { name: headers[idx], index: idx }
  }
  return null
}

/**
 * Convert an Excel date serial (number) to YYYY-MM-DD.
 * Excel epoch is Jan 1, 1900 (serial 1). Excel has a known leap-year bug
 * where serial 60 = Feb 29, 1900 (doesn't exist) — serials > 60 are shifted
 * by 1 day relative to real dates.
 */
function excelSerialToDate(serial: number): string {
  const adjusted = serial > 60 ? serial - 1 : serial
  const epoch = Date.UTC(1899, 11, 31) // Dec 31, 1899
  const date = new Date(epoch + adjusted * 86_400_000)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Convert a cell value to YYYY-MM-DD.
 * Handles Date objects, Excel date serials, and common string formats.
 * Returns '' on failure.
 */
function toDateString(raw: unknown): string {
  if (raw == null || raw === '') return ''

  // Date object returned by exceljs for date-formatted cells
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return ''
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Excel numeric date serial
  if (typeof raw === 'number') {
    return excelSerialToDate(raw)
  }

  const s = String(raw).trim()
  if (!s) return ''

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Try native Date parse as last resort
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
  }

  return ''
}

/**
 * Parse a numeric field. Returns null for blank, '-', '#VALUE!', or non-numeric.
 */
function toNumber(raw: unknown): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '' || s === '-' || s.startsWith('#')) return null
  const n = parseFloat(s.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

/**
 * Resolve an exceljs cell value to a plain JS primitive.
 * Handles formula results, rich text, and hyperlink objects.
 */
function resolveCellValue(value: unknown): unknown {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof value !== 'object') return value

  const obj = value as Record<string, unknown>

  // Formula cell: { formula, result, ... }
  if ('result' in obj) return resolveCellValue(obj.result)

  // Rich text: { richText: [{ text, font }, ...] }
  if ('richText' in obj && Array.isArray(obj.richText)) {
    return (obj.richText as Array<{ text: string }>).map((r) => r.text).join('')
  }

  // Hyperlink: { text, hyperlink }
  if ('text' in obj) return obj.text

  return null
}

/**
 * Find the header row in a sheet (first row where ≥2 of the 4 key columns match).
 * Returns the 0-based row index and parsed header strings, or null.
 */
function findHeaderRow(
  rows: unknown[][],
): { headerRowIndex: number; headers: string[] } | null {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r]
    if (!row) continue
    const headers = row.map((c) => (c == null ? '' : String(c)))
    const normalised = headers.map(normalise)

    let hits = 0
    for (const alias of PUMP_DATE_ALIASES) {
      if (normalised.some((h) => h === alias || h.includes(alias))) { hits++; break }
    }
    for (const alias of PETROL_ALIASES) {
      if (normalised.some((h) => h === alias || h.includes(alias))) { hits++; break }
    }
    for (const alias of MILEAGE_ALIASES) {
      if (normalised.some((h) => h === alias || h.includes(alias))) { hits++; break }
    }
    for (const alias of COST_ALIASES) {
      if (normalised.some((h) => h === alias || h.includes(alias))) { hits++; break }
    }

    if (hits >= 2) return { headerRowIndex: r, headers }
  }
  return null
}

/**
 * Extract all non-empty rows from an exceljs worksheet as an array-of-arrays.
 * Row values are 1-indexed in exceljs; we convert to 0-indexed.
 */
function worksheetToArrays(worksheet: ExcelJS.Worksheet): unknown[][] {
  const result: unknown[][] = []
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const raw = row.values as unknown[]
    // row.values is 1-indexed (index 0 = undefined); slice(1) → 0-indexed
    const arr = raw.slice(1).map((v) => (v === undefined ? null : resolveCellValue(v)))
    result.push(arr)
  })
  return result
}

// ─── Main parse function ──────────────────────────────────────────────────────

/**
 * Parse an uploaded file (Buffer) and return structured rows.
 * Tries each sheet in order; uses the first sheet with a recognisable header.
 */
export async function parseImportFile(arrayBuffer: ArrayBuffer, isCsv: boolean): Promise<ParseOutcome> {
  const workbook = new ExcelJS.Workbook()
  const buf = Buffer.from(arrayBuffer)

  try {
    if (isCsv) {
      const stream = new Readable()
      stream.push(buf as Uint8Array)
      stream.push(null)
      await workbook.csv.read(stream)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buf as any)
    }
  } catch {
    return { error: 'Could not read file. Make sure it is a valid .xlsx or .csv.' }
  }

  for (const worksheet of workbook.worksheets) {
    const raw = worksheetToArrays(worksheet)

    if (raw.length < 2) continue

    const found = findHeaderRow(raw)
    if (!found) continue

    const { headerRowIndex, headers } = found

    const dateCol    = findColumn(headers, PUMP_DATE_ALIASES)
    const petrolCol  = findColumn(headers, PETROL_ALIASES)
    const mileageCol = findColumn(headers, MILEAGE_ALIASES)

    // For cost, try exact "cost" first, then broader aliases
    // This avoids picking "Net Cost" when "Cost" is also present
    let costCol = findColumn(headers, ['cost (sgd)', 'cost(sgd)', 'cost'])
    if (!costCol) costCol = findColumn(headers, COST_ALIASES)

    if (!dateCol || !petrolCol || !mileageCol || !costCol) continue

    const dataRows = raw.slice(headerRowIndex + 1)
    const parsed: ParsedRow[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const sheetRow = headerRowIndex + 1 + i

      const rawDate    = row[dateCol.index]
      const rawPetrol  = row[petrolCol.index]
      const rawMileage = row[mileageCol.index]
      const rawCost    = row[costCol.index]

      // Skip rows that are entirely blank in the key columns
      if (rawDate == null && rawPetrol == null && rawMileage == null && rawCost == null) {
        continue
      }

      const pump_date  = toDateString(rawDate)
      const petrol_l   = toNumber(rawPetrol)
      const mileage_km = toNumber(rawMileage)
      const cost       = toNumber(rawCost)

      // Validate
      let valid = true
      let invalidReason: string | undefined

      if (!pump_date) {
        valid = false
        invalidReason = `Unparseable date: "${rawDate}"`
      } else if (petrol_l === null) {
        valid = false
        invalidReason = `Petrol value skipped: "${rawPetrol}"`
      } else if (petrol_l <= 0) {
        valid = false
        invalidReason = `Petrol must be > 0 (got ${petrol_l})`
      } else if (mileage_km === null || mileage_km <= 0) {
        valid = false
        invalidReason = `Invalid mileage: "${rawMileage}"`
      } else if (cost === null || cost <= 0) {
        valid = false
        invalidReason = `Invalid cost: "${rawCost}"`
      }

      parsed.push({
        sheetRow,
        pump_date,
        petrol_l,
        mileage_km,
        cost,
        valid,
        invalidReason,
      })
    }

    if (parsed.length === 0) continue

    return {
      sheetName: worksheet.name,
      rows: parsed,
      detectedColumns: {
        pumpDate:  dateCol.name,
        petrolL:   petrolCol.name,
        mileageKm: mileageCol.name,
        cost:      costCol.name,
      },
    }
  }

  return { error: 'No recognisable data sheet found. Expected columns: Pump Date, Petrol, Mileage, Cost.' }
}
