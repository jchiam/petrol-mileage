import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { Dashboard } from '@/components/dashboard/Dashboard';
import type { StatsData, VehicleRow } from '@/components/dashboard/types';
import { db } from '@/db';
import { fillUps, vehicles } from '@/db/schema';
import { computeStats } from '@/lib/stats';
import { getMockDashboard } from '@/lib/test-mocks';

export const metadata: Metadata = {
  title: 'Dashboard — Petrol Tracker',
};

// Dashboard data is request-scoped (live DB + per-request mock cookie).
// Without this, Next.js prerenders at build time with stale data.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const mock = await getMockDashboard();

  let initialVehicles: VehicleRow[];
  let initialVehicleId: number | null;
  let initialStatsData: StatsData | null;

  if (mock) {
    initialVehicles = mock.vehicles;
    initialVehicleId = mock.vehicleId;
    initialStatsData = mock.stats;
  } else {
    const vehicleRows = await db.select().from(vehicles).orderBy(vehicles.name);

    // Serialize timestamps — Next.js cannot pass Date objects as server component props
    initialVehicles = vehicleRows.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    }));

    const currentVehicle =
      initialVehicles.find((v) => v.isCurrent) ??
      initialVehicles.find((v) => v.isActive) ??
      initialVehicles[0] ??
      null;

    initialVehicleId = currentVehicle?.id ?? null;
    initialStatsData = null;

    if (currentVehicle) {
      const fills = await db
        .select()
        .from(fillUps)
        .where(eq(fillUps.vehicleId, currentVehicle.id))
        .orderBy(fillUps.pumpDate, fillUps.id);

      const result = computeStats(fills);
      initialStatsData = {
        kpis: result.kpis,
        forecast: result.forecast,
        charts: result.charts,
        fillsWithAnomalies: result.fillsWithAnomalies.map((f) => ({
          id: f.id,
          vehicleId: f.vehicleId,
          pumpDate: f.pumpDate,
          petrolL: f.petrolL,
          mileageKm: f.mileageKm,
          cost: f.cost,
          voidedAt: f.voidedAt?.toISOString() ?? null,
          voidReason: f.voidReason,
          createdAt: f.createdAt.toISOString(),
          kmPerL: f.kmPerL,
          costPerKm: f.costPerKm,
          costPerL: f.costPerL,
          anomalies: f.anomalies,
        })),
      };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Dashboard
          initialVehicles={initialVehicles}
          initialVehicleId={initialVehicleId}
          initialStatsData={initialStatsData}
        />
      </div>
    </div>
  );
}
