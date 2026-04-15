export interface AnomalyFlag {
  type: 'efficiency' | 'price'
  message: string
  zScore?: number
  mean?: number
  pctAboveMedian?: number
  median?: number
}

export interface FillRow {
  id: number
  vehicleId: number
  pumpDate: string
  petrolL: string
  mileageKm: string
  cost: string
  voidedAt: string | null
  voidReason: string | null
  createdAt: string
  kmPerL: number
  costPerKm: number
  costPerL: number
  anomalies: AnomalyFlag[]
}

export interface KPIs {
  latestKmPerL: number | null
  rollingKmPerL30d: number | null
  latestCostPerKm: number | null
  mtdSpend: number
}

export interface Forecast {
  nextMonthExpected: number | null
  nextMonthLow: number | null
  nextMonthHigh: number | null
  annualProjection: number | null
}

export interface ChartFillPoint {
  date: string
  id: number
  kmPerL: number
  rolling5: number | null
  costPerKm: number
}

export interface ChartData {
  fills: ChartFillPoint[]
  monthlySpend: Array<{ month: string; spend: number }>
}

export interface StatsData {
  kpis: KPIs
  forecast: Forecast
  charts: ChartData
  fillsWithAnomalies: FillRow[]
}

export interface VehicleRow {
  id: number
  name: string
  make: string | null
  model: string | null
  year: number | null
  plate: string | null
  isActive: boolean
  isCurrent: boolean
  createdAt: string
}
