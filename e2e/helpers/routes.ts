import type { Page } from '@playwright/test';

import type { StatsData } from '../mocks';

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
