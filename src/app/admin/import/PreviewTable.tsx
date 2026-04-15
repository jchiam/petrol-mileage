'use client'

import type { ParsedRow } from '@/lib/import-parser'

interface Props {
  rows: ParsedRow[]
  selected: Set<number>
  onToggle: (sheetRow: number) => void
  onSelectAll: (value: boolean) => void
}

export function PreviewTable({ rows, selected, onToggle, onSelectAll }: Props) {
  const validRows = rows.filter((r) => r.valid)
  const allValidSelected = validRows.length > 0 && validRows.every((r) => selected.has(r.sheetRow))
  const someSelected = rows.some((r) => selected.has(r.sheetRow))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{selected.size}</span> of{' '}
          <span className="font-medium">{rows.length}</span> rows selected
          {rows.some((r) => !r.valid) && (
            <span className="ml-2 text-amber-600">
              ({rows.filter((r) => !r.valid).length} invalid, deselected by default)
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSelectAll(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Select all valid
          </button>
          {someSelected && (
            <button
              type="button"
              onClick={() => onSelectAll(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Deselect all
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allValidSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded"
                  title="Select / deselect all valid rows"
                />
              </th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Petrol (L)</th>
              <th className="px-3 py-2 text-right">Mileage (km)</th>
              <th className="px-3 py-2 text-right">Cost ($)</th>
              <th className="px-3 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const checked = selected.has(row.sheetRow)
              return (
                <tr
                  key={row.sheetRow}
                  className={
                    !row.valid
                      ? 'bg-red-50 text-gray-500'
                      : checked
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-50 text-gray-500'
                  }
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!row.valid}
                      onChange={() => onToggle(row.sheetRow)}
                      className="rounded disabled:opacity-40"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {row.pump_date || <span className="text-red-400 italic">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {row.petrol_l != null ? row.petrol_l.toFixed(3) : <span className="text-red-400 italic">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {row.mileage_km != null ? row.mileage_km.toFixed(1) : <span className="text-red-400 italic">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {row.cost != null ? row.cost.toFixed(2) : <span className="text-red-400 italic">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {!row.valid && (
                      <span className="text-red-500">{row.invalidReason}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
