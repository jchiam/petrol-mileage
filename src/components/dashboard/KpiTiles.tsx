import type { KPIs } from './types'

function fmt(n: number | null, prefix = '', suffix = '', dp = 2): string {
  if (n == null) return '—'
  return `${prefix}${n.toFixed(dp)}${suffix}`
}

export function KpiTiles({ kpis }: { kpis: KPIs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Tile
        label="Latest km/L"
        value={fmt(kpis.latestKmPerL, '', '', 2)}
        sublabel="most recent fill"
      />
      <Tile
        label="30-day avg km/L"
        value={fmt(kpis.rollingKmPerL30d, '', '', 2)}
        sublabel="trailing 30 days"
      />
      <Tile
        label="Latest $/km"
        value={fmt(kpis.latestCostPerKm, '$', '', 3)}
        sublabel="most recent fill"
      />
      <Tile
        label="MTD spend"
        value={fmt(kpis.mtdSpend, '$', '', 2)}
        sublabel="this calendar month"
      />
    </div>
  )
}

function Tile({
  label,
  value,
  sublabel,
}: {
  label: string
  value: string
  sublabel: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none mb-1">{value}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
  )
}
