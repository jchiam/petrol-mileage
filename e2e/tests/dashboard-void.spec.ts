/**
 * Void fill-up e2e — critical cross-component flow only.
 *
 * Dialog open/close/disabled-state/cancel/api-error live as component tests.
 */
import { expect, test } from '@playwright/test';

import { setupDashboardState, setupVoidMock } from '../helpers/routes';
import { makeFillRow, makeStats, makeVehicle } from '../mocks';

const FILL_ID = 99;

test('successful void shows banner with "Log now" link', async ({ page }) => {
  const fill = makeFillRow({ id: FILL_ID, pumpDate: '2024-01-15' });
  await setupDashboardState(page, { vehicles: [makeVehicle()], stats: makeStats([fill]) });
  await setupVoidMock(page, FILL_ID);
  await page.goto('/');

  await page.getByRole('button', { name: 'Void & re-enter' }).click();
  await page.locator('#void-reason').fill('Wrong mileage entered');

  const dialog = page.locator('.fixed.inset-0');
  await dialog.getByRole('button', { name: 'Void & re-enter' }).click();

  await expect(page.getByText(/Fill-up voided/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log now' })).toBeVisible();
});
