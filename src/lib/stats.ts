import type { FillUp } from '@/db/schema'

// ─── Date helpers (Asia/Singapore) ───────────────────────────────────────────

/** YYYY-MM-DD string for today in SGT */
export function todaySGT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

/** First day of the current month in SGT: 'YYYY-MM-01' */
export function monthStartSGT(): string {
  const d = todaySGT()
  return d.slice(0, 8) + '01'
}

/** YYYY-MM-DD string for N days before today in SGT */
export function daysAgoSGT(n: number): string {
  const ms = Date.now() - n * 86_400_000
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

/** Days in a given month (month is 1-indexed) */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ─── Pure math helpers ────────────────────────────────────────────────────────

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(variance)
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// ─── Per-fill computed metrics ────────────────────────────────────────────────

export interface FillMetrics {
  kmPerL: number
  costPerKm: number
  costPerL: number
}

export function computeMetrics(
  fill: Pick<FillUp, 'petrolL' | 'mileageKm' | 'cost'>,
): FillMetrics {
  const petrolL = parseFloat(String(fill.petrolL))
  const mileageKm = parseFloat(String(fill.mileageKm))
  const cost = parseFloat(String(fill.cost))
  return {
    kmPerL: petrolL > 0 ? mileageKm / petrolL : 0,
    costPerKm: mileageKm > 0 ? cost / mileageKm : 0,
    costPerL: petrolL > 0 ? cost / petrolL : 0,
  }
}

// ─── Anomaly detection ────────────────────────────────────────────────────────

export interface EfficiencyAnomaly {
  type: 'efficiency'
  zScore: number
  mean: number
  message: string
}

export interface PriceAnomaly {
  type: 'price'
  pctAboveMedian: number
  median: number
  message: string
}

export type AnomalyFlag = EfficiencyAnomaly | PriceAnomaly

/**
 * Detect anomalies for a fill given the trailing (up to 10) non-voided fills
 * that preceded it. Requires at least 3 trailing fills to flag anything.
 */
export function detectAnomalies(
  current: FillMetrics,
  trailing: FillMetrics[],
): AnomalyFlag[] {
  if (trailing.length < 3) return []

  const flags: AnomalyFlag[] = []

  // Efficiency: flag if km/L deviates >2σ from trailing 10-fill mean
  const trailingKmPerL = trailing.map((f) => f.kmPerL)
  const effMean = mean(trailingKmPerL)
  const effSd = stddev(trailingKmPerL)
  if (effSd > 0) {
    const z = (current.kmPerL - effMean) / effSd
    if (Math.abs(z) > 2) {
      flags.push({
        type: 'efficiency',
        zScore: Math.round(z * 10) / 10,
        mean: Math.round(effMean * 10) / 10,
        message: `km/L of ${current.kmPerL.toFixed(1)} is ${Math.abs(z).toFixed(1)}σ ${z < 0 ? 'below' : 'above'} recent average of ${effMean.toFixed(1)}`,
      })
    }
  }

  // Price: flag if $/L is >15% above trailing 10-fill median
  const trailingCostPerL = trailing.map((f) => f.costPerL)
  const priceMedian = median(trailingCostPerL)
  if (priceMedian > 0) {
    const pctAbove = (current.costPerL - priceMedian) / priceMedian
    if (pctAbove > 0.15) {
      flags.push({
        type: 'price',
        pctAboveMedian: Math.round(pctAbove * 1000) / 10,
        median: Math.round(priceMedian * 100) / 100,
        message: `$/L of ${current.costPerL.toFixed(2)} is ${Math.round(pctAbove * 100)}% above recent median of ${priceMedian.toFixed(2)}`,
      })
    }
  }

  return flags
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface KPIs {
  latestKmPerL: number | null
  rollingKmPerL30d: number | null
  latestCostPerKm: number | null
  mtdSpend: number
}

export function computeKPIs(fills: FillUp[]): KPIs {
  const active = fills
    .filter((f) => !f.voidedAt)
    .sort((a, b) => a.pumpDate.localeCompare(b.pumpDate) || a.id - b.id)

  const latest = active[active.length - 1]
  const today = todaySGT()
  const thirtyDaysAgo = daysAgoSGT(30)
  const monthStart = monthStartSGT()

  const latestMetrics = latest ? computeMetrics(latest) : null

  const last30 = active.filter((f) => f.pumpDate >= thirtyDaysAgo && f.pumpDate <= today)
  const rollingKmPerL30d =
    last30.length > 0 ? mean(last30.map((f) => computeMetrics(f).kmPerL)) : null

  const mtdSpend = active
    .filter((f) => f.pumpDate >= monthStart && f.pumpDate <= today)
    .reduce((sum, f) => sum + parseFloat(String(f.cost)), 0)

  return {
    latestKmPerL: latestMetrics ? Math.round(latestMetrics.kmPerL * 100) / 100 : null,
    rollingKmPerL30d: rollingKmPerL30d ? Math.round(rollingKmPerL30d * 100) / 100 : null,
    latestCostPerKm: latestMetrics ? Math.round(latestMetrics.costPerKm * 100) / 100 : null,
    mtdSpend: Math.round(mtdSpend * 100) / 100,
  }
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export interface Forecast {
  nextMonthExpected: number | null
  nextMonthLow: number | null
  nextMonthHigh: number | null
  annualProjection: number | null
}

export function computeForecast(fills: FillUp[]): Forecast {
  const empty: Forecast = {
    nextMonthExpected: null,
    nextMonthLow: null,
    nextMonthHigh: null,
    annualProjection: null,
  }

  const active = fills
    .filter((f) => !f.voidedAt)
    .sort((a, b) => a.pumpDate.localeCompare(b.pumpDate))

  if (active.length === 0) return empty

  const today = todaySGT()
  const ninetyDaysAgo = daysAgoSGT(90)
  const trailing90 = active.filter((f) => f.pumpDate >= ninetyDaysAgo && f.pumpDate <= today)

  if (trailing90.length === 0) return empty

  const totalCost90 = trailing90.reduce((sum, f) => sum + parseFloat(String(f.cost)), 0)
  const avgDailyCost = totalCost90 / 90

  // Daily cost stddev over the 90-day window
  const dailyCosts = new Map<string, number>()
  for (const f of trailing90) {
    dailyCosts.set(f.pumpDate, (dailyCosts.get(f.pumpDate) ?? 0) + parseFloat(String(f.cost)))
  }
  const dailyStddev = stddev(Array.from(dailyCosts.values()))

  // Next month dimensions
  const sgtStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' })
  const sgtNow = new Date(sgtStr)
  const rawNextMonth = sgtNow.getMonth() + 2 // getMonth is 0-indexed; +2 = next month (1-indexed)
  const nextMonthYear = rawNextMonth > 12 ? sgtNow.getFullYear() + 1 : sgtNow.getFullYear()
  const nextMonthNum = rawNextMonth > 12 ? 1 : rawNextMonth
  const nextMonthDays = daysInMonth(nextMonthYear, nextMonthNum)

  const nextMonthExpected = avgDailyCost * nextMonthDays
  const sigma = dailyStddev * Math.sqrt(nextMonthDays)

  // Annual projection
  const yearStart = `${sgtNow.getFullYear()}-01-01`
  const yearEnd = `${sgtNow.getFullYear()}-12-31`
  const ytdSpend = active
    .filter((f) => f.pumpDate >= yearStart && f.pumpDate <= today)
    .reduce((sum, f) => sum + parseFloat(String(f.cost)), 0)

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(yearEnd).getTime() - new Date(today).getTime()) / 86_400_000),
  )
  const annualProjection = ytdSpend + avgDailyCost * daysRemaining

  return {
    nextMonthExpected: Math.round(nextMonthExpected * 100) / 100,
    nextMonthLow: Math.round(Math.max(0, nextMonthExpected - sigma) * 100) / 100,
    nextMonthHigh: Math.round((nextMonthExpected + sigma) * 100) / 100,
    annualProjection: Math.round(annualProjection * 100) / 100,
  }
}

// ─── Chart series ─────────────────────────────────────────────────────────────

export interface ChartFillPoint {
  date: string
  id: number
  kmPerL: number
  rolling5: number | null
  costPerKm: number
}

export interface MonthlySpendPoint {
  month: string // 'YYYY-MM'
  spend: number
}

export interface ChartData {
  fills: ChartFillPoint[]
  monthlySpend: MonthlySpendPoint[]
}

export function computeCharts(fills: FillUp[]): ChartData {
  const active = fills
    .filter((f) => !f.voidedAt)
    .sort((a, b) => a.pumpDate.localeCompare(b.pumpDate) || a.id - b.id)

  const fillPoints: ChartFillPoint[] = active.map((f, i) => {
    const metrics = computeMetrics(f)
    const window = active.slice(Math.max(0, i - 4), i + 1)
    const rolling5 =
      window.length >= 2 ? Math.round(mean(window.map((w) => computeMetrics(w).kmPerL)) * 100) / 100 : null
    return {
      date: f.pumpDate,
      id: f.id,
      kmPerL: Math.round(metrics.kmPerL * 100) / 100,
      rolling5,
      costPerKm: Math.round(metrics.costPerKm * 100) / 100,
    }
  })

  const monthMap = new Map<string, number>()
  for (const f of active) {
    const month = f.pumpDate.slice(0, 7)
    monthMap.set(month, (monthMap.get(month) ?? 0) + parseFloat(String(f.cost)))
  }
  const monthlySpend: MonthlySpendPoint[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, spend]) => ({ month, spend: Math.round(spend * 100) / 100 }))

  return { fills: fillPoints, monthlySpend }
}

// ─── Full stats result ────────────────────────────────────────────────────────

export interface FillWithAnomalies extends FillUp {
  kmPerL: number
  costPerKm: number
  costPerL: number
  anomalies: AnomalyFlag[]
}

export interface StatsResult {
  kpis: KPIs
  forecast: Forecast
  charts: ChartData
  fillsWithAnomalies: FillWithAnomalies[]
}

export function computeStats(fills: FillUp[]): StatsResult {
  const sorted = [...fills].sort((a, b) => a.pumpDate.localeCompare(b.pumpDate) || a.id - b.id)
  const active = sorted.filter((f) => !f.voidedAt)

  const fillsWithAnomalies: FillWithAnomalies[] = sorted.map((fill) => {
    const metrics = computeMetrics(fill)

    let anomalies: AnomalyFlag[] = []
    if (!fill.voidedAt) {
      // Trailing 10 non-voided fills that came before this one
      const trailing = active
        .filter(
          (f) =>
            f.pumpDate < fill.pumpDate ||
            (f.pumpDate === fill.pumpDate && f.id < fill.id),
        )
        .slice(-10)
        .map(computeMetrics)
      anomalies = detectAnomalies(metrics, trailing)
    }

    return {
      ...fill,
      kmPerL: Math.round(metrics.kmPerL * 100) / 100,
      costPerKm: Math.round(metrics.costPerKm * 100) / 100,
      costPerL: Math.round(metrics.costPerL * 100) / 100,
      anomalies,
    }
  })

  return {
    kpis: computeKPIs(fills),
    forecast: computeForecast(fills),
    charts: computeCharts(fills),
    fillsWithAnomalies,
  }
}
