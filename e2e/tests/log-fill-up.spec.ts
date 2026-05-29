/**
 * Log fill-up e2e tests — critical journey only.
 *
 * Field visibility, reset, error states live as component tests.
 */
import { expect, test } from '@playwright/test';

import { setupLogPageState } from '../helpers/routes';

const MOCK_FILL_RESPONSE = {
  id: 1,
  vehicleId: 1,
  pumpDate: '2024-01-15',
  petrolL: '40.000',
  mileageKm: '500.0',
  cost: '80.00',
  voidedAt: null,
  voidReason: null,
  createdAt: '2024-01-15T00:00:00.000Z',
};

test('no current vehicle shows empty state', async ({ page }) => {
  await setupLogPageState(page, { currentVehicle: null });
  await page.goto('/log');
  await expect(page.getByText('No current vehicle set.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Go to dashboard/ })).toBeVisible();
});

test('happy path: fill form → confirmation card shows metrics', async ({ page }) => {
  await setupLogPageState(page, { currentVehicle: { id: 1, name: 'Test Car' } });
  await page.route('**/api/fills', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, json: MOCK_FILL_RESPONSE });
    }
    return route.continue();
  });

  await page.goto('/log');

  await page.locator('#log-date').fill('2024-01-15');
  await page.locator('#log-petrol').fill('40');
  await page.locator('#log-mileage').fill('500');
  await page.locator('#log-cost').fill('80');
  await page.getByRole('button', { name: 'Log Fill-Up' }).click();

  await expect(page.getByText('Fill-up saved')).toBeVisible();
  await expect(page.getByText('km/L')).toBeVisible();
  await expect(page.getByText('$/km')).toBeVisible();
  await expect(page.getByText('$/L')).toBeVisible();
});
