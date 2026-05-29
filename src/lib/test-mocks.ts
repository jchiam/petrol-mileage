/**
 * Server-side mock state for e2e tests.
 *
 * Playwright sets a cookie before navigation; server components read it via
 * `next/headers` and skip the real DB query. Gated by `E2E_MOCKS=1` so
 * production deployments never honor these cookies.
 */
import { cookies } from 'next/headers';

import type { StatsData, VehicleRow } from '@/components/dashboard/types';

export interface MockDashboard {
  vehicles: VehicleRow[];
  vehicleId: number | null;
  stats: StatsData | null;
}

export interface MockLogPage {
  currentVehicle: { id: number; name: string } | null;
}

async function readMock<T>(cookieName: string): Promise<T | null> {
  if (process.env.E2E_MOCKS !== '1') return null;
  const jar = await cookies();
  const raw = jar.get(cookieName)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return null;
  }
}

export function getMockDashboard(): Promise<MockDashboard | null> {
  return readMock<MockDashboard>('pw-dashboard');
}

export function getMockLogPage(): Promise<MockLogPage | null> {
  return readMock<MockLogPage>('pw-log');
}
