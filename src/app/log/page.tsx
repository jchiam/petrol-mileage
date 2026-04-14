import { db } from '@/db'
import { vehicles } from '@/db/schema'
import { LogForm } from './LogForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log Fill-Up — Petrol Tracker',
}

export default async function LogPage() {
  const allVehicles = await db.select().from(vehicles).orderBy(vehicles.name)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-5 pt-6 pb-safe">
        {allVehicles.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No vehicles set up yet.{' '}
            <a href="/" className="underline">
              Add one on the dashboard.
            </a>
          </p>
        ) : (
          <LogForm initialVehicles={allVehicles} />
        )}
      </div>
    </div>
  )
}
