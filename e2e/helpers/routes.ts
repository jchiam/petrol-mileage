import type { Page } from '@playwright/test';

import type { StatsData, VehicleData } from '../mocks';

interface LogPageVehicle {
  id: number;
  name: string;
}

interface DashboardMock {
  vehicles: VehicleData[];
  vehicleId?: number | null;
  stats?: StatsData | null;
}

/** Set Playwright mock cookies so the server component skips its DB query.
 *  Must be called before page.goto(). Server reads via next/headers and
 *  honors the cookie only when E2E_MOCKS=1 (set by playwright webServer env). */
export async function setupDashboardState(page: Page, state: DashboardMock): Promise<void> {
  const vehicleId =
    state.vehicleId !== undefined
      ? state.vehicleId
      : (state.vehicles.find((v) => v.isCurrent)?.id ??
        state.vehicles.find((v) => v.isActive)?.id ??
        state.vehicles[0]?.id ??
        null);
  await page.context().addCookies([
    {
      name: 'pw-dashboard',
      value: encodeURIComponent(
        JSON.stringify({
          vehicles: state.vehicles,
          vehicleId,
          stats: state.stats ?? null,
        }),
      ),
      url: 'http://localhost:3000',
    },
  ]);
}

/** Server-side mock for the log page's current vehicle. */
export async function setupLogPageState(
  page: Page,
  state: { currentVehicle: LogPageVehicle | null },
): Promise<void> {
  await page.context().addCookies([
    {
      name: 'pw-log',
      value: encodeURIComponent(JSON.stringify(state)),
      url: 'http://localhost:3000',
    },
  ]);
}

/** Mock all /api/fills/stats?vehicle_id=* requests with the given stats payload. */
export async function setupStatsMock(page: Page, stats: StatsData): Promise<void> {
  await page.route('**/api/fills/stats*', (route) => route.fulfill({ json: stats }));
}

/** Mock POST /api/fills/[id]/void with a 200 response. */
export async function setupVoidMock(
  page: Page,
  fillId: number,
  responseBody?: Record<string, unknown>,
): Promise<void> {
  await page.route(`**/api/fills/${fillId}/void`, (route) =>
    route.fulfill({
      status: 200,
      json: responseBody ?? { id: fillId, voidedAt: new Date().toISOString(), voidReason: 'test' },
    }),
  );
}

/** Mock GET /api/vehicles. POST requests pass through to per-test mocks. */
export async function setupVehiclesMock(page: Page, vehicles: VehicleData[]): Promise<void> {
  await page.route('**/api/vehicles', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: vehicles });
    return route.continue();
  });
}
