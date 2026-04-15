'use client'

import { useState } from 'react'
import type { Vehicle } from '@/db/schema'

interface LogFormProps {
  currentVehicle: Vehicle | null
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

export function LogForm({ currentVehicle }: LogFormProps) {
  const [date, setDate] = useState(todayString)
  const [petrolL, setPetrolL] = useState('')
  const [mileageKm, setMileageKm] = useState('')
  const [cost, setCost] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<ConfirmedFill | null>(null)

  if (!currentVehicle) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-600 mb-2">No current vehicle set.</p>
        <a href="/" className="text-blue-600 underline text-sm">
          Go to dashboard to set one ★
        </a>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/fills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: currentVehicle.id,
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
        vehicleName: currentVehicle.name,
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
      {/* Vehicle display */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Vehicle</span>
        <div className="flex items-center justify-between">
          <p className="text-gray-900 font-medium">{currentVehicle.name}</p>
          <a href="/" className="text-xs text-gray-500 hover:text-gray-700">
            Change in dashboard →
          </a>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-date" className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
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
        <label htmlFor="log-petrol" className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Petrol
        </label>
        <div className="relative">
          <input
            id="log-petrol"
            type="number"
            step="any"
            min="0"
            placeholder="0.000"
            value={petrolL}
            onChange={(e) => setPetrolL(e.target.value)}
            required
            className="w-full h-14 px-4 pr-10 text-lg text-gray-900 placeholder:text-gray-500 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-white"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
            L
          </span>
        </div>
      </div>

      {/* Mileage */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-mileage" className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Mileage since last fill
        </label>
        <div className="relative">
          <input
            id="log-mileage"
            type="number"
            step="any"
            min="0"
            placeholder="0.0"
            value={mileageKm}
            onChange={(e) => setMileageKm(e.target.value)}
            required
            className="w-full h-14 px-4 pr-14 text-lg text-gray-900 placeholder:text-gray-500 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-white"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
            km
          </span>
        </div>
      </div>

      {/* Cost */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-cost" className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Total cost
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
            $
          </span>
          <input
            id="log-cost"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
            className="w-full h-14 pl-8 pr-4 text-lg text-gray-900 placeholder:text-gray-500 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-white"
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
          className="h-12 flex items-center justify-center rounded-xl text-sm font-medium text-gray-600 border-2 border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
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
