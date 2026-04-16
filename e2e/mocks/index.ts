// Mock data factories for e2e tests.
// These mirror the shapes in src/components/dashboard/types.ts but are
// defined inline to avoid importing Next.js-specific app source.

export interface AnomalyFlag {
  type: 'efficiency' | 'price';
  message: string;
  zScore?: number;
  mean?: number;
  pctAboveMedian?: number;
  median?: number;
}

export interface FillRow {
  id: number;
  vehicleId: number;
  pumpDate: string;
  petrolL: string;
  mileageKm: string;
  cost: string;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  kmPerL: number;
  costPerKm: number;
  costPerL: number;
  anomalies: AnomalyFlag[];
}

export interface StatsData {
  kpis: {
    latestKmPerL: number | null;
    rollingKmPerL30d: number | null;
    latestCostPerKm: number | null;
    mtdSpend: number;
  };
  forecast: {
    nextMonthExpected: number | null;
    nextMonthLow: number | null;
    nextMonthHigh: number | null;
    annualProjection: number | null;
  };
  charts: {
    fills: Array<{
      date: string;
      id: number;
      kmPerL: number;
      rolling5: number | null;
      costPerKm: number;
    }>;
    monthlySpend: Array<{ month: string; spend: number }>;
  };
  fillsWithAnomalies: FillRow[];
}

export interface VehicleData {
  id: number;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
}

export function makeFillRow(overrides: Partial<FillRow> = {}): FillRow {
  return {
    id: 1,
    vehicleId: 1,
    pumpDate: '2024-01-15',
    petrolL: '40.000',
    mileageKm: '500.0',
    cost: '80.00',
    voidedAt: null,
    voidReason: null,
    createdAt: '2024-01-15T00:00:00.000Z',
    kmPerL: 12.5,
    costPerKm: 0.16,
    costPerL: 2.0,
    anomalies: [],
    ...overrides,
  };
}

export function makeStats(fills: FillRow[] = [makeFillRow()]): StatsData {
  return {
    kpis: {
      latestKmPerL: 12.5,
      rollingKmPerL30d: 12.1,
      latestCostPerKm: 0.16,
      mtdSpend: 240.0,
    },
    forecast: {
      nextMonthExpected: 310.0,
      nextMonthLow: 270.0,
      nextMonthHigh: 350.0,
      annualProjection: 3720.0,
    },
    charts: {
      fills: fills
        .filter((f) => !f.voidedAt)
        .map((f) => ({
          date: f.pumpDate,
          id: f.id,
          kmPerL: f.kmPerL,
          rolling5: f.kmPerL,
          costPerKm: f.costPerKm,
        })),
      monthlySpend: [{ month: '2024-01', spend: 240.0 }],
    },
    fillsWithAnomalies: fills,
  };
}

export function makeVehicle(overrides: Partial<VehicleData> = {}): VehicleData {
  return {
    id: 1,
    name: 'Test Car',
    make: null,
    model: null,
    year: null,
    plate: null,
    isActive: true,
    isCurrent: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
