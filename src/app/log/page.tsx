import { db } from '@/db'
import { vehicles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { LogForm } from './LogForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log Fill-Up — Petrol Tracker',
}

export default async function LogPage() {
  const [currentVehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.isCurrent, true))
    .limit(1)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-5 pt-6 pb-safe">
        <LogForm currentVehicle={currentVehicle ?? null} />
      </div>
    </div>
  )
}
