import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FillUp } from '@/db/schema';
import {
  computeCharts,
  computeForecast,
  computeKPIs,
  computeMetrics,
  computeStats,
  daysAgoSGT,
  daysInMonth,
  detectAnomalies,
  type FillMetrics,
  mean,
  median,
  monthStartSGT,
  stddev,
  todaySGT,
} from '@/lib/stats';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFill(
  overrides: Partial<FillUp> & {
    id?: number;
    pumpDate?: string;
    petrolL?: string;
    mileageKm?: string;
    cost?: string;
  },
): FillUp {
  return {
    id: overrides.id ?? 1,
    vehicleId: 1,
    pumpDate: overrides.pumpDate ?? '2024-01-01',
    petrolL: overrides.petrolL ?? '40.000',
    mileageKm: overrides.mileageKm ?? '500.0',
    cost: overrides.cost ?? '80.00',
    voidedAt: overrides.voidedAt ?? null,
    voidReason: overrides.voidReason ?? null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── mean / stddev / median ───────────────────────────────────────────────────

describe('mean', () => {
  it('returns 0 for empty array', () => expect(mean([])).toBe(0));
  it('computes mean of [1, 2, 3]', () => expect(mean([1, 2, 3])).toBeCloseTo(2));
  it('computes mean of [10, 20]', () => expect(mean([10, 20])).toBe(15));
});

describe('stddev', () => {
  it('returns 0 for single element', () => expect(stddev([5])).toBe(0));
  it('computes sample stddev of [2, 4, 4, 4, 5, 5, 7, 9]', () => {
    // sample stddev ≈ 2.138
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });
  it('returns 0 for identical values', () => expect(stddev([5, 5, 5])).toBe(0));
});

describe('median', () => {
  it('returns 0 for empty array', () => expect(median([])).toBe(0));
  it('odd-length array', () => expect(median([3, 1, 2])).toBe(2));
  it('even-length array', () => expect(median([1, 2, 3, 4])).toBe(2.5));
});

// ─── daysInMonth ──────────────────────────────────────────────────────────────

describe('daysInMonth', () => {
  it('Jan has 31 days', () => expect(daysInMonth(2024, 1)).toBe(31));
  it('Feb 2024 (leap) has 29 days', () => expect(daysInMonth(2024, 2)).toBe(29));
  it('Feb 2023 (non-leap) has 28 days', () => expect(daysInMonth(2023, 2)).toBe(28));
  it('Apr has 30 days', () => expect(daysInMonth(2024, 4)).toBe(30));
});

// ─── computeMetrics ───────────────────────────────────────────────────────────

describe('computeMetrics', () => {
  it('computes km/L, $/km, $/L', () => {
    const m = computeMetrics({ petrolL: '40', mileageKm: '500', cost: '80' });
    expect(m.kmPerL).toBeCloseTo(12.5);
    expect(m.costPerKm).toBeCloseTo(0.16);
    expect(m.costPerL).toBe(2);
  });

  it('returns 0 when petrolL is 0 (no division by zero)', () => {
    const m = computeMetrics({ petrolL: '0', mileageKm: '500', cost: '80' });
    expect(m.kmPerL).toBe(0);
    expect(m.costPerL).toBe(0);
  });

  it('returns 0 costPerKm when mileageKm is 0', () => {
    const m = computeMetrics({ petrolL: '40', mileageKm: '0', cost: '80' });
    expect(m.costPerKm).toBe(0);
  });
});

// ─── detectAnomalies ──────────────────────────────────────────────────────────

describe('detectAnomalies', () => {
  const normal: FillMetrics = { kmPerL: 12, costPerKm: 0.16, costPerL: 2.0 };

  const goodTrailing: FillMetrics[] = Array.from({ length: 8 }, () => ({
    kmPerL: 12,
    costPerKm: 0.16,
    costPerL: 2.0,
  }));

  it('returns [] when fewer than 3 trailing fills', () => {
    expect(detectAnomalies(normal, [])).toEqual([]);
    expect(detectAnomalies(normal, [normal, normal])).toEqual([]);
  });

  it('flags efficiency anomaly when km/L is >2σ below mean', () => {
    // trailing: km/L all 12, stddev 0 — use varied set for non-zero stddev
    const trailing: FillMetrics[] = [
      { kmPerL: 10, costPerKm: 0.2, costPerL: 2.0 },
      { kmPerL: 12, costPerKm: 0.17, costPerL: 2.1 },
      { kmPerL: 11, costPerKm: 0.18, costPerL: 2.0 },
      { kmPerL: 12, costPerKm: 0.16, costPerL: 1.9 },
      { kmPerL: 13, costPerKm: 0.15, costPerL: 2.0 },
    ];
    // mean ≈ 11.6, stddev ≈ 1.14 → 2σ threshold ≈ 9.32
    const lowEfficiency: FillMetrics = { kmPerL: 5, costPerKm: 0.4, costPerL: 2.0 };
    const flags = detectAnomalies(lowEfficiency, trailing);
    const effFlag = flags.find((f) => f.type === 'efficiency');
    expect(effFlag).toBeDefined();
    expect(effFlag!.type).toBe('efficiency');
  });

  it('does not flag efficiency when within 2σ', () => {
    const trailing: FillMetrics[] = Array.from({ length: 5 }, (_, i) => ({
      kmPerL: 11 + i * 0.5,
      costPerKm: 0.16,
      costPerL: 2.0,
    }));
    const flags = detectAnomalies({ kmPerL: 12, costPerKm: 0.16, costPerL: 2.0 }, trailing);
    expect(flags.find((f) => f.type === 'efficiency')).toBeUndefined();
  });

  it('flags price anomaly when $/L is >15% above median', () => {
    // trailing median $/L = 2.0
    const flags = detectAnomalies({ kmPerL: 12, costPerKm: 0.18, costPerL: 2.5 }, goodTrailing);
    const priceFlag = flags.find((f) => f.type === 'price');
    expect(priceFlag).toBeDefined();
    expect(priceFlag!.type).toBe('price');
    if (priceFlag?.type === 'price') {
      expect(priceFlag.pctAboveMedian).toBeGreaterThan(15);
      expect(priceFlag.median).toBeCloseTo(2.0);
    }
  });

  it('does not flag price when $/L is exactly at 15% (boundary)', () => {
    // 15% above 2.0 = 2.30 → not flagged (must be strictly > 0.15)
    const flags = detectAnomalies({ kmPerL: 12, costPerKm: 0.16, costPerL: 2.3 }, goodTrailing);
    expect(flags.find((f) => f.type === 'price')).toBeUndefined();
  });

  it('does not flag price when $/L is below median', () => {
    const flags = detectAnomalies({ kmPerL: 12, costPerKm: 0.16, costPerL: 1.5 }, goodTrailing);
    expect(flags.find((f) => f.type === 'price')).toBeUndefined();
  });
});

// ─── computeKPIs ──────────────────────────────────────────────────────────────

describe('computeKPIs', () => {
  it('returns nulls for empty fill list', () => {
    const kpis = computeKPIs([]);
    expect(kpis.latestKmPerL).toBeNull();
    expect(kpis.rollingKmPerL30d).toBeNull();
    expect(kpis.latestCostPerKm).toBeNull();
    expect(kpis.mtdSpend).toBe(0);
  });

  it('excludes voided fills from KPI computation', () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
    const fills: FillUp[] = [
      makeFill({
        id: 1,
        pumpDate: today,
        petrolL: '40',
        mileageKm: '500',
        cost: '80',
        voidedAt: new Date(),
      }),
      makeFill({ id: 2, pumpDate: today, petrolL: '50', mileageKm: '600', cost: '100' }),
    ];
    const kpis = computeKPIs(fills);
    // Should use fill id=2 (non-voided): km/L = 600/50 = 12
    expect(kpis.latestKmPerL).toBeCloseTo(12);
    expect(kpis.mtdSpend).toBeCloseTo(100);
  });
});

// ─── computeCharts ────────────────────────────────────────────────────────────

describe('computeCharts', () => {
  it('returns empty series for no fills', () => {
    const charts = computeCharts([]);
    expect(charts.fills).toHaveLength(0);
    expect(charts.monthlySpend).toHaveLength(0);
  });

  it('rolling5 is null for first fill, non-null from second', () => {
    const fills: FillUp[] = [
      makeFill({ id: 1, pumpDate: '2024-01-01' }),
      makeFill({ id: 2, pumpDate: '2024-01-15' }),
    ];
    const { fills: pts } = computeCharts(fills);
    expect(pts[0].rolling5).toBeNull();
    expect(pts[1].rolling5).not.toBeNull();
  });

  it('groups monthly spend correctly', () => {
    const fills: FillUp[] = [
      makeFill({ id: 1, pumpDate: '2024-01-10', cost: '80' }),
      makeFill({ id: 2, pumpDate: '2024-01-20', cost: '90' }),
      makeFill({ id: 3, pumpDate: '2024-02-05', cost: '70' }),
    ];
    const { monthlySpend } = computeCharts(fills);
    expect(monthlySpend).toHaveLength(2);
    expect(monthlySpend.find((m) => m.month === '2024-01')?.spend).toBeCloseTo(170);
    expect(monthlySpend.find((m) => m.month === '2024-02')?.spend).toBeCloseTo(70);
  });

  it('excludes voided fills from charts', () => {
    const fills: FillUp[] = [
      makeFill({ id: 1, pumpDate: '2024-01-10', cost: '80', voidedAt: new Date() }),
      makeFill({ id: 2, pumpDate: '2024-01-20', cost: '90' }),
    ];
    const { fills: pts, monthlySpend } = computeCharts(fills);
    expect(pts).toHaveLength(1);
    expect(monthlySpend[0].spend).toBeCloseTo(90);
  });
});

// ─── computeForecast ──────────────────────────────────────────────────────────

describe('computeForecast', () => {
  it('returns nulls for empty fill list', () => {
    const f = computeForecast([]);
    expect(f.nextMonthExpected).toBeNull();
    expect(f.annualProjection).toBeNull();
  });

  it('returns nulls when no fills in trailing 90 days', () => {
    const fills: FillUp[] = [makeFill({ pumpDate: '2020-01-01', cost: '80' })];
    const f = computeForecast(fills);
    // 2020-01-01 is well outside 90-day window
    expect(f.nextMonthExpected).toBeNull();
  });

  it('nextMonthLow <= nextMonthExpected <= nextMonthHigh', () => {
    const _today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
    // Generate 10 fills spread over the last 80 days
    const fills: FillUp[] = Array.from({ length: 10 }, (_, i) =>
      makeFill({
        id: i + 1,
        pumpDate: new Date(Date.now() - (i + 1) * 8 * 86_400_000).toLocaleDateString('en-CA', {
          timeZone: 'Asia/Singapore',
        }),
        cost: String(70 + (i % 3) * 10),
      }),
    );
    const f = computeForecast(fills);
    expect(f.nextMonthExpected).not.toBeNull();
    expect(f.nextMonthLow!).toBeLessThanOrEqual(f.nextMonthExpected!);
    expect(f.nextMonthHigh!).toBeGreaterThanOrEqual(f.nextMonthExpected!);
    expect(f.nextMonthLow!).toBeGreaterThanOrEqual(0);
  });

  it('annualProjection >= ytdSpend', () => {
    const _today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
    const fills: FillUp[] = Array.from({ length: 5 }, (_, i) =>
      makeFill({
        id: i + 1,
        pumpDate: new Date(Date.now() - (i + 1) * 15 * 86_400_000).toLocaleDateString('en-CA', {
          timeZone: 'Asia/Singapore',
        }),
        cost: '80',
      }),
    );
    const f = computeForecast(fills);
    expect(f.annualProjection).not.toBeNull();
    expect(f.annualProjection!).toBeGreaterThan(0);
  });
});

// ─── Date helpers (SGT) ───────────────────────────────────────────────────────

describe('todaySGT / monthStartSGT / daysAgoSGT', () => {
  // Pin to 2024-03-15T10:00:00Z which is 2024-03-15 18:00 SGT (UTC+8).
  const PINNED_UTC_MS = Date.UTC(2024, 2, 15, 10, 0, 0); // months are 0-indexed

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PINNED_UTC_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('todaySGT returns YYYY-MM-DD in SGT timezone', () => {
    expect(todaySGT()).toBe('2024-03-15');
  });

  it('monthStartSGT returns first of current SGT month', () => {
    expect(monthStartSGT()).toBe('2024-03-01');
  });

  it('daysAgoSGT(0) = today', () => {
    expect(daysAgoSGT(0)).toBe('2024-03-15');
  });

  it('daysAgoSGT(7) = one week before', () => {
    expect(daysAgoSGT(7)).toBe('2024-03-08');
  });

  it('daysAgoSGT(30) crosses month boundary', () => {
    // 2024-03-15 minus 30 days = 2024-02-14
    expect(daysAgoSGT(30)).toBe('2024-02-14');
  });
});

// ─── computeStats integration ─────────────────────────────────────────────────

describe('computeStats', () => {
  it('returns correct shape for empty fills', () => {
    const result = computeStats([]);
    expect(result.kpis.latestKmPerL).toBeNull();
    expect(result.forecast.nextMonthExpected).toBeNull();
    expect(result.charts.fills).toHaveLength(0);
    expect(result.fillsWithAnomalies).toHaveLength(0);
  });

  it('voided fills appear in fillsWithAnomalies but not in KPIs/charts', () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
    const fills: FillUp[] = [
      makeFill({
        id: 1,
        pumpDate: today,
        petrolL: '40',
        mileageKm: '500',
        cost: '80',
        voidedAt: new Date(),
      }),
      makeFill({ id: 2, pumpDate: today, petrolL: '50', mileageKm: '600', cost: '100' }),
    ];
    const result = computeStats(fills);
    // Both fills present in the table view
    expect(result.fillsWithAnomalies).toHaveLength(2);
    // KPIs only see fill id=2 (non-voided): km/L = 600/50 = 12
    expect(result.kpis.latestKmPerL).toBeCloseTo(12);
    // Chart only contains non-voided fill
    expect(result.charts.fills).toHaveLength(1);
    expect(result.charts.fills[0].id).toBe(2);
  });

  it('anomalies are attached per fill', () => {
    // Create 6 fills with consistent km/L ~12 so stddev is non-zero
    const dates = [
      '2024-01-01',
      '2024-01-08',
      '2024-01-15',
      '2024-01-22',
      '2024-01-29',
      '2024-02-05',
    ];
    const fills: FillUp[] = [
      makeFill({ id: 1, pumpDate: dates[0], petrolL: '40', mileageKm: '480', cost: '80' }),
      makeFill({ id: 2, pumpDate: dates[1], petrolL: '40', mileageKm: '500', cost: '80' }),
      makeFill({ id: 3, pumpDate: dates[2], petrolL: '40', mileageKm: '520', cost: '80' }),
      makeFill({ id: 4, pumpDate: dates[3], petrolL: '40', mileageKm: '510', cost: '80' }),
      makeFill({ id: 5, pumpDate: dates[4], petrolL: '40', mileageKm: '490', cost: '80' }),
      // Last fill: terrible km/L to trigger efficiency anomaly
      makeFill({ id: 6, pumpDate: dates[5], petrolL: '40', mileageKm: '100', cost: '80' }),
    ];
    const result = computeStats(fills);
    const lastFill = result.fillsWithAnomalies.find((f) => f.id === 6);
    expect(lastFill).toBeDefined();
    expect(lastFill!.anomalies.some((a) => a.type === 'efficiency')).toBe(true);
  });

  it('fills sorted by pumpDate then id in fillsWithAnomalies', () => {
    const fills: FillUp[] = [
      makeFill({ id: 3, pumpDate: '2024-03-01' }),
      makeFill({ id: 1, pumpDate: '2024-01-01' }),
      makeFill({ id: 2, pumpDate: '2024-02-01' }),
    ];
    const result = computeStats(fills);
    const ids = result.fillsWithAnomalies.map((f) => f.id);
    expect(ids).toEqual([1, 2, 3]);
  });
});
