'use client'

import { useState, useCallback, useRef } from 'react'
import type { ParsedRow, ParseResult } from '@/lib/import-parser'
import { PreviewTable } from './PreviewTable'
import { VehicleSelect } from '@/components/VehicleSelect'

interface VehicleOption {
  id: number
  name: string
  isActive: boolean
}

type Step = 'upload' | 'preview' | 'done'

interface DoneResult {
  inserted: number
  skipped: number
  errors: { index: number; error: string }[]
}

// ── Isolated component so its own state never interferes with ImportWizard ──

function CreateVehicleForm({ onCancel }: { onCancel?: () => void }) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create vehicle')
        return
      }
      window.location.reload()
    } catch {
      setError('Network error — please try again')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm">
      <p className="text-sm font-medium text-gray-700 mb-1">Add a vehicle</p>
      <p className="text-xs text-gray-500 mb-4">
        Create the vehicle first, then import fill-ups for it.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Vehicle name (e.g. Honda City)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Cancel
        </button>
      )}
    </div>
  )
}

export function ImportWizard({ vehicles }: { vehicles: VehicleOption[] }) {
  const [step, setStep] = useState<Step>('upload')
  const [vehicleId, setVehicleId] = useState<number>(
    vehicles.find((v) => v.isActive)?.id ?? vehicles[0]?.id ?? 0,
  )
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parseResults, setParseResults] = useState<ParseResult[] | null>(null)
  const [sheetIdx, setSheetIdx] = useState(0)
  const [parseError, setParseError] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [doneResult, setDoneResult] = useState<DoneResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File selection ──────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setParseError('')
    setParseResults(null)
    setSheetIdx(0)
    setSelected(new Set())
    setParsing(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/parse-import', { method: 'POST', body: formData })
      const outcome = await res.json()

      if ('error' in outcome) {
        setParseError(outcome.error)
        return
      }

      const sheets = outcome as ParseResult[]
      setFileName(file.name)
      setParseResults(sheets)
      setSheetIdx(0)

      // Pre-select all valid rows in the first sheet
      const initialSelected = new Set(
        sheets[0].rows.filter((r: ParsedRow) => r.valid).map((r: ParsedRow) => r.sheetRow),
      )
      setSelected(initialSelected)
      setStep('preview')
    } catch {
      setParseError('Failed to parse file — please try again')
    } finally {
      setParsing(false)
    }
  }, [])

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  // ── Row selection helpers ───────────────────────────────────────────────────

  const toggleRow = useCallback((sheetRow: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(sheetRow)) next.delete(sheetRow)
      else next.add(sheetRow)
      return next
    })
  }, [])

  const selectAll = useCallback(
    (value: boolean) => {
      const sheet = parseResults?.[sheetIdx]
      if (!sheet) return
      if (value) {
        setSelected(new Set(sheet.rows.filter((r) => r.valid).map((r) => r.sheetRow)))
      } else {
        setSelected(new Set())
      }
    },
    [parseResults, sheetIdx],
  )

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const sheet = parseResults?.[sheetIdx]
    if (!sheet || selected.size === 0 || !vehicleId) return
    setSubmitting(true)
    setSubmitError('')

    const rowMap = new Map<number, ParsedRow>(sheet.rows.map((r) => [r.sheetRow, r]))
    const toInsert = [...selected]
      .map((sr) => rowMap.get(sr))
      .filter((r): r is ParsedRow => r != null && r.valid)
      .map((r) => ({
        pump_date: r.pump_date,
        petrol_l: r.petrol_l,
        mileage_km: r.mileage_km,
        cost: r.cost,
      }))

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, rows: toInsert }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Import failed')
        return
      }
      setDoneResult(data)
      setStep('done')
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }, [parseResults, sheetIdx, selected, vehicleId])

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep('upload')
    setFileName('')
    setParseResults(null)
    setSheetIdx(0)
    setParseError('')
    setParsing(false)
    setSelected(new Set())
    setSubmitError('')
    setDoneResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ── Empty state: no vehicles ────────────────────────────────────────────────

  if (vehicles.length === 0) {
    return <CreateVehicleForm />
  }

  const sheet = parseResults?.[sheetIdx] ?? null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Vehicle selector — always visible until done */}
      {step !== 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Import into vehicle
          </label>
          <VehicleSelect
            vehicles={vehicles}
            value={vehicleId || null}
            onChange={setVehicleId}
          />
          {!showAddVehicle && (
            <button
              type="button"
              onClick={() => setShowAddVehicle(true)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add vehicle
            </button>
          )}
          {showAddVehicle && (
            <div className="mt-4">
              <CreateVehicleForm onCancel={() => setShowAddVehicle(false)} />
            </div>
          )}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div
            onDrop={parsing ? undefined : onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !parsing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${parsing ? 'border-blue-300 cursor-wait' : 'border-gray-300 cursor-pointer hover:border-blue-400'}`}
          >
            {parsing ? (
              <p className="text-blue-500 text-sm">Parsing file…</p>
            ) : (
              <p className="text-gray-500 text-sm">
                Drag & drop an <span className="font-medium">.xlsx</span> or{' '}
                <span className="font-medium">.csv</span> file here, or click to browse
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={onFileChange}
              className="hidden"
            />
          </div>
          {parseError && (
            <p className="mt-3 text-sm text-red-600">{parseError}</p>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && sheet && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-medium text-gray-900">{fileName}</p>
              {parseResults && parseResults.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {parseResults.map((s, i) => (
                    <button
                      key={s.sheetName}
                      type="button"
                      onClick={() => {
                        setSheetIdx(i)
                        setSelected(new Set(parseResults[i].rows.filter((r) => r.valid).map((r) => r.sheetRow)))
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${i === sheetIdx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {s.sheetName}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {(!parseResults || parseResults.length === 1) && <>Sheet: <span className="font-mono">{sheet.sheetName}</span>{' · '}</>}
                Detected columns:{' '}
                <span className="font-mono">{sheet.detectedColumns.pumpDate}</span>,{' '}
                <span className="font-mono">{sheet.detectedColumns.petrolL}</span>,{' '}
                <span className="font-mono">{sheet.detectedColumns.mileageKm}</span>,{' '}
                <span className="font-mono">{sheet.detectedColumns.cost}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Choose a different file
            </button>
          </div>

          <PreviewTable
            rows={sheet.rows}
            selected={selected}
            onToggle={toggleRow}
            onSelectAll={selectAll}
          />

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selected.size === 0 || submitting}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting
                ? 'Importing…'
                : `Import ${selected.size} row${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && doneResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
          <div className="text-4xl">✓</div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {doneResult.inserted} fill-up{doneResult.inserted !== 1 ? 's' : ''} imported
            </p>
            {doneResult.skipped > 0 && (
              <p className="text-sm text-amber-600 mt-1">
                {doneResult.skipped} row{doneResult.skipped !== 1 ? 's' : ''} skipped
              </p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              Import another file
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Go to dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
