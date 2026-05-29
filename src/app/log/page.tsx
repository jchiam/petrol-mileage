import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { db } from '@/db';
import { vehicles } from '@/db/schema';
import { getMockLogPage } from '@/lib/test-mocks';

import { LogForm } from './LogForm';

export const metadata: Metadata = {
  title: 'Log Fill-Up — Petrol Tracker',
};

// Current vehicle is request-scoped (live DB + per-request mock cookie).
export const dynamic = 'force-dynamic';

export default async function LogPage() {
  const mock = await getMockLogPage();

  let currentVehicle: { id: number; name: string } | null;
  if (mock) {
    currentVehicle = mock.currentVehicle;
  } else {
    const rows = await db
      .select({ id: vehicles.id, name: vehicles.name })
      .from(vehicles)
      .where(eq(vehicles.isCurrent, true))
      .limit(1);
    currentVehicle = rows[0] ?? null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-safe mx-auto max-w-sm px-5 pt-6">
        <LogForm currentVehicle={currentVehicle} />
      </div>
    </div>
  );
}
