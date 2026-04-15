'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { VehicleRow, StatsData } from './types'
import { KpiTiles } from './KpiTiles'
import { ForecastCard } from './ForecastCard'
import { FillsTable } from './FillsTable'
import { CompareTab } from './CompareTab'
import { VehicleSelect } from '../VehicleSelect'

// Charts use Recharts which is browser-only
const Charts = dynamic(() => import('./Charts'), { ssr: false })

export function Dashboard({ initialVehicles }: { initialVehicles: VehicleRow[] }) {
  const activeVehicles = initialVehicles.filter((v) => v.isActive)

  const getDefaultVehicleId = () => {
    const current = initialVehicles.find((v) => v.isCurrent)
    return (current ?? activeVehicles[0] ?? initialVehicles[0])?.id ?? null
  }

  const [vehicles, setVehicles] = useState(initialVehicles)
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(getDefaultVehicleId)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'overview' | 'compare'>('overview')

  const fetchStats = useCallback(async (vehicleId: number) => {
    setLoading(true)
    setStatsData(null)
    try {
      const res = await fetch(`/api/fills/stats?vehicle_id=${vehicleId}`)
      if (res.ok) setStatsData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedVehicleId != null) fetchStats(selectedVehicleId)
  }, [selectedVehicleId, fetchStats])

  const handleVehicleChange = (id: number) => {
    setSelectedVehicleId(id)
  }

  const handleSetCurrent = async (id: number) => {
    const res = await fetch(`/api/vehicles/${id}/set-current`, { method: 'POST' })
    if (res.ok) {
      setVehicles((prev) => prev.map((v) => ({ ...v, isCurrent: v.id === id })))
    }
  }

  if (initialVehicles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-2">No vehicles set up yet.</p>
        <a href="/admin/import" className="text-blue-600 underline text-sm">
          Import historical data
        </a>
      </div>
    )
  }

  const hasFills = statsData && statsData.fillsWithAnomalies.some((f) => !f.voidedAt)

  return (
    <div>
      {/* Vehicle switcher + action */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600 shrink-0">Vehicle</span>
          <VehicleSelect
            vehicles={vehicles}
            value={selectedVehicleId}
            onChange={handleVehicleChange}
            onSetCurrent={handleSetCurrent}
          />
        </div>
        <a
          href="/log"
          className="h-9 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium flex items-center hover:bg-gray-700 transition-colors shrink-0"
        >
          Log fill-up &rarr;
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-8">
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
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
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
                    if (selectedVehicleId != null) fetchStats(selectedVehicleId)
                  }}
                />
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">{children}</h2>
}
