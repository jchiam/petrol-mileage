import type { Metadata } from 'next';

import { Dashboard } from '@/components/dashboard/Dashboard';
import { db } from '@/db';
import { vehicles } from '@/db/schema';

export const metadata: Metadata = {
  title: 'Dashboard — Petrol Tracker',
};

export default async function HomePage() {
  const allVehicles = await db.select().from(vehicles).orderBy(vehicles.name);
  // Serialize Date → string for client component props
  const vehicleRows = allVehicles.map((v) => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
  }));
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Dashboard initialVehicles={vehicleRows} />
      </div>
    </div>
  );
}
