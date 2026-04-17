'use client';

import Link from 'next/link';
import { useState } from 'react';

interface VehicleData {
  id: number;
  name: string;
}

interface ConfirmedFill {
  vehicleName: string;
  pumpDate: string;
  kmPerL: number;
  costPerKm: number;
  costPerL: number;
}

function todayString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

function round(n: number, dp: number): string {
  return n.toFixed(dp);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function LogForm({ currentVehicle }: { currentVehicle: VehicleData | null }) {
  const [date, setDate] = useState(todayString);
  const [petrolL, setPetrolL] = useState('');
  const [mileageKm, setMileageKm] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedFill | null>(null);

  if (!currentVehicle) {
    return (
      <div className="py-16 text-center">
        <p className="mb-2 text-gray-600">No current vehicle set.</p>
        <Link href="/" className="text-sm text-blue-600 underline">
          Go to dashboard to set one ★
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

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
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
        return;
      }

      const pl = parseFloat(petrolL);
      const km = parseFloat(mileageKm);
      const c = parseFloat(cost);

      setConfirmed({
        vehicleName: currentVehicle.name,
        pumpDate: date,
        kmPerL: km / pl,
        costPerKm: c / km,
        costPerL: c / pl,
      });
    } catch {
      setError('Network error — check your connection');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setConfirmed(null);
    setPetrolL('');
    setMileageKm('');
    setCost('');
    setDate(todayString());
    setError(null);
  };

  if (confirmed) {
    return <ConfirmationCard data={confirmed} onBack={resetForm} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Vehicle display */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Vehicle</span>
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900">{currentVehicle.name}</p>
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-700">
            Change in dashboard →
          </Link>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="log-date"
          className="text-sm font-semibold tracking-wide text-gray-600 uppercase"
        >
          Date
        </label>
        <input
          id="log-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="h-14 rounded-xl border-2 border-gray-200 bg-white px-4 text-lg text-gray-900 focus:border-gray-900 focus:outline-none"
        />
      </div>

      {/* Petrol */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="log-petrol"
          className="text-sm font-semibold tracking-wide text-gray-600 uppercase"
        >
          Petrol
        </label>
        <div className="relative">
          <input
            id="log-petrol"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0.000"
            value={petrolL}
            onChange={(e) => setPetrolL(e.target.value)}
            required
            className="h-14 w-full rounded-xl border-2 border-gray-200 bg-white px-4 pr-10 text-lg text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-gray-500">
            L
          </span>
        </div>
      </div>

      {/* Mileage */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="log-mileage"
          className="text-sm font-semibold tracking-wide text-gray-600 uppercase"
        >
          Mileage since last fill
        </label>
        <div className="relative">
          <input
            id="log-mileage"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0.0"
            value={mileageKm}
            onChange={(e) => setMileageKm(e.target.value)}
            required
            className="h-14 w-full rounded-xl border-2 border-gray-200 bg-white px-4 pr-14 text-lg text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-gray-500">
            km
          </span>
        </div>
      </div>

      {/* Cost */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="log-cost"
          className="text-sm font-semibold tracking-wide text-gray-600 uppercase"
        >
          Total cost
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-medium text-gray-500">
            $
          </span>
          <input
            id="log-cost"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
            className="h-14 w-full rounded-xl border-2 border-gray-200 bg-white pr-4 pl-8 text-lg text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="px-1 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 h-14 rounded-xl bg-gray-900 text-lg font-semibold text-white transition-colors active:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Log Fill-Up'}
      </button>
    </form>
  );
}

function ConfirmationCard({ data, onBack }: { data: ConfirmedFill; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-green-600">Fill-up saved</p>
        <p className="text-sm text-gray-500">
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
          className="h-14 rounded-xl bg-gray-900 text-lg font-semibold text-white transition-colors active:bg-gray-700"
        >
          Log another
        </button>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-xl border-2 border-gray-300 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-gray-50 p-4">
      <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</span>
      <span className="text-xl font-bold text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}
