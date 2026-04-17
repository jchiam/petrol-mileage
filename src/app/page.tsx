import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { db } from '@/db';
import { fillUps, vehicles } from '@/db/schema';
import { computeStats } from '@/lib/stats';
import { Dashboard } from '@/components/dashboard/Dashboard';
import type { StatsData, VehicleRow } from '@/components/dashboard/types';

export const metadata: Metadata = {
  title: 'Dashboard — Petrol Tracker',
};

export default async function HomePage() {
  const vehicleRows = await db.select().from(vehicles).orderBy(vehicles.name);

  // Serialize timestamps — Next.js cannot pass Date objects as server component props
  const initialVehicles: VehicleRow[] = vehicleRows.map((v) => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
  }));

  const currentVehicle =
    initialVehicles.find((v) => v.isCurrent) ??
    initialVehicles.find((v) => v.isActive) ??
    initialVehicles[0] ??
    null;

  let initialStatsData: StatsData | null = null;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Dashboard
          initialVehicles={initialVehicles}
          initialVehicleId={currentVehicle?.id ?? null}
          initialStatsData={initialStatsData}
        />
      </div>
    </div>
  );
}
