'use client';

import { useEffect, useState } from 'react';

import type { FillRow, StatsData, VehicleRow } from './types';

interface LifetimeStats {
  fillCount: number;
  totalSpend: number;
  totalKm: number;
  totalL: number;
  kmPerL: number | null;
  costPerKm: number | null;
}

function computeLifetime(fills: FillRow[]): LifetimeStats {
  const active = fills.filter((f) => !f.voidedAt);
  const totalSpend = active.reduce((s, f) => s + parseFloat(f.cost), 0);
  const totalKm = active.reduce((s, f) => s + parseFloat(f.mileageKm), 0);
  const totalL = active.reduce((s, f) => s + parseFloat(f.petrolL), 0);
  return {
    fillCount: active.length,
    totalSpend,
    totalKm,
    totalL,
    kmPerL: totalL > 0 ? totalKm / totalL : null,
    costPerKm: totalKm > 0 ? totalSpend / totalKm : null,
  };
}

function fmt(n: number | null, prefix = '', dp = 2): string {
  if (n == null) return '—';
  return `${prefix}${n.toFixed(dp)}`;
}

export function CompareTab({ initialVehicles }: { initialVehicles: VehicleRow[] }) {
  const [rows, setRows] = useState<Array<{ vehicle: VehicleRow; stats: LifetimeStats }> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rows) return; // already loaded
    setLoading(true);
    setError(null);

    Promise.all(
      initialVehicles.map((v) =>
        fetch(`/api/fills/stats?vehicle_id=${v.id}`)
          .then((r) => r.json() as Promise<StatsData>)
          .then((data) => ({
            vehicle: v,
            stats: computeLifetime(data.fillsWithAnomalies),
          })),
      ),
    )
      .then((results) => {
        setRows(results);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load comparison data');
        setLoading(false);
      });
  }, [initialVehicles, rows]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-red-600">{error}</p>;
  }

  if (!rows) return null;

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-600 uppercase">
        All vehicles — lifetime
      </h2>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <Th>Vehicle</Th>
              <Th>Fills</Th>
              <Th>km/L (lifetime)</Th>
              <Th>$/km (lifetime)</Th>
              <Th>Total spend</Th>
              <Th>Total km</Th>
              <Th>Total fuel (L)</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ vehicle, stats }) => (
              <tr
                key={vehicle.id}
                className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${
                  !vehicle.isActive ? 'opacity-50' : ''
                }`}
              >
                <td className="px-4 py-3 font-medium whitespace-nowrap text-gray-900">
                  {vehicle.name}
                  {!vehicle.isActive && (
                    <span className="ml-1.5 text-xs font-normal text-gray-500">(retired)</span>
                  )}
                </td>
                <Td>{stats.fillCount}</Td>
                <Td>{fmt(stats.kmPerL, '', 2)}</Td>
                <Td>{fmt(stats.costPerKm, '$', 3)}</Td>
                <Td>${stats.totalSpend.toFixed(2)}</Td>
                <Td>{stats.totalKm.toFixed(0)}</Td>
                <Td>{stats.totalL.toFixed(1)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-gray-600 uppercase">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-gray-700 tabular-nums">{children}</td>;
}
