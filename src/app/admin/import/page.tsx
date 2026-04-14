import { db } from '@/db'
import { vehicles } from '@/db/schema'
import { ImportWizard } from './ImportWizard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Import — Petrol Tracker',
}

export default async function ImportPage() {
  const allVehicles = await db.select().from(vehicles).orderBy(vehicles.name)
  const vehicleRows = allVehicles.map((v) => ({
    id: v.id,
    name: v.name,
    isActive: v.isActive,
  }))
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import fill-ups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload an Excel (.xlsx) or CSV file exported from your old tracker.
          </p>
        </div>
        <ImportWizard vehicles={vehicleRows} />
      </div>
    </div>
  )
}
