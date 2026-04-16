'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import { VehicleSelect } from '../VehicleSelect';
import { CompareTab } from './CompareTab';
import { FillsTable } from './FillsTable';
import { ForecastCard } from './ForecastCard';
import { KpiTiles } from './KpiTiles';
import type { StatsData, VehicleRow } from './types';

// Charts use Recharts which is browser-only
const Charts = dynamic(() => import('./Charts'), { ssr: false });

export function Dashboard({ initialVehicles }: { initialVehicles: VehicleRow[] }) {
  const activeVehicles = initialVehicles.filter((v) => v.isActive);

  const getDefaultVehicleId = () => {
    const current = initialVehicles.find((v) => v.isCurrent);
    return (current ?? activeVehicles[0] ?? initialVehicles[0])?.id ?? null;
  };

  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(getDefaultVehicleId);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'compare'>('overview');
  const [voidedMessage, setVoidedMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async (vehicleId: number) => {
    setLoading(true);
    setStatsData(null);
    try {
      const res = await fetch(`/api/fills/stats?vehicle_id=${vehicleId}`);
      if (res.ok) setStatsData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedVehicleId != null) fetchStats(selectedVehicleId);
  }, [selectedVehicleId, fetchStats]);

  const handleVehicleChange = (id: number) => {
    setSelectedVehicleId(id);
  };

  const handleSetCurrent = async (id: number) => {
    const res = await fetch(`/api/vehicles/${id}/set-current`, { method: 'POST' });
    if (res.ok) {
      setVehicles((prev) => prev.map((v) => ({ ...v, isCurrent: v.id === id })));
    }
  };

  if (initialVehicles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-gray-500">No vehicles set up yet.</p>
        <a href="/admin/import" className="text-sm text-blue-600 underline">
          Import historical data
        </a>
      </div>
    );
  }

  const hasFills = statsData && statsData.fillsWithAnomalies.some((f) => !f.voidedAt);

  return (
    <div>
      {/* Vehicle switcher + action */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-gray-600">Vehicle</span>
          <VehicleSelect
            vehicles={vehicles}
            value={selectedVehicleId}
            onChange={handleVehicleChange}
            onSetCurrent={handleSetCurrent}
          />
        </div>
        <a
          href="/log"
          className="flex h-9 shrink-0 items-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Log fill-up &rarr;
        </a>
      </div>

      {/* Void success banner */}
      {voidedMessage && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {voidedMessage}{' '}
          <a href="/log" className="font-medium underline">
            Log now
          </a>
        </p>
      )}

      {/* Tabs */}
      <div className="mb-8 flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Overview
        </TabButton>
        <TabButton active={tab === 'compare'} onClick={() => setTab('compare')}>
          Compare vehicles
        </TabButton>
      </div>

      {tab === 'compare' ? (
        <CompareTab initialVehicles={vehicles} />
      ) : (
        <>
          {/* Loading spinner */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
            </div>
          )}

          {/* Empty state */}
          {!loading && statsData && !hasFills && (
            <div className="py-16 text-center text-gray-500">
              No fills recorded for this vehicle yet.{' '}
              <a href="/log" className="underline">
                Log your first fill.
              </a>
            </div>
          )}

          {/* Main content */}
          {!loading && statsData && hasFills && (
            <div className="flex flex-col gap-10">
              <KpiTiles kpis={statsData.kpis} />

              <section>
                <SectionHeading>Trends</SectionHeading>
                <Charts charts={statsData.charts} />
              </section>

              <ForecastCard forecast={statsData.forecast} />

              <section>
                <SectionHeading>Recent fills</SectionHeading>
                <FillsTable
                  fills={statsData.fillsWithAnomalies}
                  onVoidSuccess={() => {
                    setVoidedMessage('Fill-up voided. Go to /log to re-enter.');
                    setTimeout(() => setVoidedMessage(null), 5000);
                    if (selectedVehicleId != null) fetchStats(selectedVehicleId);
                  }}
                />
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-600 uppercase">{children}</h2>
  );
}
