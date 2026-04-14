'use client'

import { useState } from 'react'
import type { Vehicle } from '@/db/schema'

interface LogFormProps {
  initialVehicles: Vehicle[]
}

interface ConfirmedFill {
  vehicleName: string
  pumpDate: string
  kmPerL: number
  costPerKm: number
  costPerL: number
}

function todayString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

function round(n: number, dp: number): string {
  return n.toFixed(dp)
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function LogForm({ initialVehicles }: LogFormProps) {
  const activeVehicles = initialVehicles.filter((v) => v.isActive)
  const hasRetired = initialVehicles.some((v) => !v.isActive)

  const [showRetired, setShowRetired] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(
    (activeVehicles[0] ?? initialVehicles[0]).id,
  )
  const [date, setDate] = useState(todayString)
  const [petrolL, setPetrolL] = useState('')
  const [mileageKm, setMileageKm] = useState('')
  const [cost, setCost] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<ConfirmedFill | null>(null)

  const visibleVehicles = showRetired ? initialVehicles : activeVehicles
  const selectedVehicle = initialVehicles.find((v) => v.id === selectedVehicleId)
  // Show vehicle selector only when there's a choice to make
  const showSelector = visibleVehicles.length > 1 || (showRetired && initialVehicles.length > 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/fills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: selectedVehicleId,
          pump_date: date,
          petrol_l: petrolL,
          mileage_km: mileageKm,
          cost: cost,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        return
      }

      const pl = parseFloat(petrolL)
      const km = parseFloat(mileageKm)
      const c = parseFloat(cost)

      setConfirmed({
        vehicleName: selectedVehicle?.name ?? 'Vehicle',
        pumpDate: date,
        kmPerL: km / pl,
        costPerKm: c / km,
        costPerL: c / pl,
      })
    } catch {
      setError('Network error — check your connection')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setConfirmed(null)
    setPetrolL('')
    setMileageKm('')
    setCost('')
    setDate(todayString())
    setError(null)
  }

  if (confirmed) {
    return <ConfirmationCard data={confirmed} onBack={resetForm} />
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Vehicle selector — hidden when only one active vehicle */}
      {(activeVehicles.length > 1 || showRetired || hasRetired) && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Vehicle
          </span>

          {showSelector && (
            <div className="flex flex-wrap gap-2">
              {visibleVehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={[
                    'px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors',
                    selectedVehicleId === v.id
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50',
                    !v.isActive ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          {/* Show retired toggle — only when there are retired vehicles */}
          {hasRetired && (
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer w-fit mt-1">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(e) => {
                  setShowRetired(e.target.checked)
                  // If we hid retired and the current selection is retired, switch to first active
                  if (!e.target.checked && selectedVehicle && !selectedVehicle.isActive) {
                    if (activeVehicles[0]) setSelectedVehicleId(activeVehicles[0].id)
                  }
                }}
                className="w-4 h-4 rounded"
              />
              Show retired vehicles
            </label>
          )}
        </div>
      )}

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-date" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Date
        </label>
        <input
          id="log-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="h-14 px-4 text-lg text-gray-900 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-white"
        />
      </div>

      {/* Petrol */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-petrol" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Petrol
        </label>
        <div className="relative">
          <input
            id="log-petrol"
            type="text"
            inputMode="decimal"
            placeholder="0.000"
            value={petrolL}
            onChange={(e) => setPetrolL(e.target.value)}
            required
            autoComplete="off"
            className="w-full h-14 px-4 pr-10 text-lg text-gray-900 placeholder:text-gray-400 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-white"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
            L
          </span>
        </div>
      </div>

      {/* Mileage */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-mileage" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Mileage since last fill
        </label>
        <div className="relative">
          <input
            id="log-mileage"
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={mileageKm}
            onChange={(e) => setMileageKm(e.target.value)}
            required
            autoComplete="off"
            className="w-full h-14 px-4 pr-14 text-lg text-gray-900 placeholder:text-gray-400 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-white"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
            km
          </span>
        </div>
      </div>

      {/* Cost */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-cost" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Total cost
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
            $
          </span>
          <input
            id="log-cost"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
            autoComplete="off"
            className="w-full h-14 pl-8 pr-4 text-lg text-gray-900 placeholder:text-gray-400 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-white"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-red-600 text-sm px-1">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="h-14 bg-gray-900 text-white rounded-xl text-lg font-semibold disabled:opacity-50 active:bg-gray-700 transition-colors mt-1"
      >
        {submitting ? 'Saving…' : 'Log Fill-Up'}
      </button>
    </form>
  )
}

function ConfirmationCard({ data, onBack }: { data: ConfirmedFill; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-green-600 font-semibold text-lg">Fill-up saved</p>
        <p className="text-gray-500 text-sm">
          {data.vehicleName} &middot; {formatDate(data.pumpDate)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="km/L" value={round(data.kmPerL, 2)} />
        <MetricTile label="$/km" value={`$${round(data.costPerKm, 3)}`} />
        <MetricTile label="$/L" value={`$${round(data.costPerL, 2)}`} />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onBack}
          className="h-14 bg-gray-900 text-white rounded-xl text-lg font-semibold active:bg-gray-700 transition-colors"
        >
          Log another
        </button>
        <a
          href="/"
          className="h-12 flex items-center justify-center rounded-xl text-sm font-medium text-gray-600 border-2 border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-4">
      <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-xl font-bold text-gray-900 tabular-nums">{value}</span>
    </div>
  )
}
