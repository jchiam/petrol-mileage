/**
 * Dashboard e2e tests — critical journeys only.
 *
 * KPI/forecast/table/pagination/dropdown details live as component tests.
 */
import { expect, test } from '@playwright/test';

import { setupDashboardState } from '../helpers/routes';
import { makeStats, makeVehicle } from '../mocks';

test('empty state shows prompt + import link', async ({ page }) => {
  await setupDashboardState(page, { vehicles: [], stats: null });
  await page.goto('/');
  await expect(page.getByText('No vehicles set up yet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Import historical data' })).toBeVisible();
});

test('compare tab shows lifetime stats table', async ({ page }) => {
  await setupDashboardState(page, { vehicles: [makeVehicle()], stats: makeStats() });
  await page.route('**/api/fills/lifetime*', (route) =>
    route.fulfill({
      json: {
        fillCount: 1,
        totalSpend: 240.0,
        totalKm: 500.0,
        totalL: 40.0,
        kmPerL: 12.5,
        costPerKm: 0.16,
      },
    }),
  );
  await page.goto('/');

  await page.getByRole('button', { name: 'Compare vehicles' }).click();
  await expect(page.getByText('All vehicles — lifetime')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Vehicle' })).toBeVisible();
});

test('star button sets current vehicle via API', async ({ page }) => {
  const vehicles = [
    makeVehicle({ id: 1, name: 'Car One', isCurrent: true }),
    makeVehicle({ id: 2, name: 'Car Two', isCurrent: false }),
  ];
  await setupDashboardState(page, { vehicles, stats: makeStats() });

  let setCurrCalled = false;
  await page.route('**/api/vehicles/*/set-current', (route) => {
    setCurrCalled = true;
    return route.fulfill({ status: 200, json: {} });
  });

  await page.goto('/');

  const vehicleSelect = page.getByTestId('vehicle-select');
  await vehicleSelect.locator('button').first().click();

  await vehicleSelect
    .locator('div[class*="absolute"]')
    .locator('button[title="Set as current car"]')
    .first()
    .click();

  expect(setCurrCalled).toBe(true);
});
