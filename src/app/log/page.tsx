import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { db } from '@/db';
import { vehicles } from '@/db/schema';

import { LogForm } from './LogForm';

export const metadata: Metadata = {
  title: 'Log Fill-Up — Petrol Tracker',
};

export default async function LogPage() {
  let currentVehicle: { id: number; name: string } | null = null;
  try {
    const rows = await db
      .select({ id: vehicles.id, name: vehicles.name })
      .from(vehicles)
      .where(eq(vehicles.isCurrent, true))
      .limit(1);
    currentVehicle = rows[0] ?? null;
  } catch {
    // DB unavailable — render without current vehicle; client fetch recovers
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-safe mx-auto max-w-sm px-5 pt-6">
        <LogForm currentVehicle={currentVehicle} />
      </div>
    </div>
  );
}
