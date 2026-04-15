import type { Metadata } from 'next';

import { db } from '@/db';
import { vehicles } from '@/db/schema';

import { ImportWizard } from './ImportWizard';

export const metadata: Metadata = {
  title: 'Import — Petrol Tracker',
};

export default async function ImportPage() {
  const allVehicles = await db.select().from(vehicles).orderBy(vehicles.name);
  const vehicleRows = allVehicles.map((v) => ({
    id: v.id,
    name: v.name,
    isActive: v.isActive,
    isCurrent: v.isCurrent,
  }));
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import fill-ups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload an Excel (.xlsx) or CSV file exported from your old tracker.
          </p>
        </div>
        <ImportWizard vehicles={vehicleRows} />
      </div>
    </div>
  );
}
