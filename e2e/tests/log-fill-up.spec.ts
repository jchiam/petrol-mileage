/**
 * Log fill-up page e2e tests.
 *
 * POST /api/fills and GET /api/vehicles are mocked for deterministic behavior.
 */
import { expect, test } from '@playwright/test';

import { setupVehiclesMock } from '../helpers/routes';
import { makeVehicle } from '../mocks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

test('no current vehicle shows empty state', async ({ page }) => {
  await setupVehiclesMock(page, [makeVehicle({ isCurrent: false })]);
  await page.goto('/log');
  await page.getByText('No current vehicle set.').waitFor({ timeout: 10_000 });
  await expect(page.getByText('No current vehicle set.')).toBeVisible();
});

test.describe('log fill-up form (requires current vehicle)', () => {
  test.beforeEach(async ({ page }) => {
    await setupVehiclesMock(page, [makeVehicle({ isCurrent: true })]);
    await page.goto('/log');
    await page.locator('#log-petrol').waitFor({ timeout: 10_000 });
  });

  test('form fields visible', async ({ page }) => {
    await expect(page.getByLabel('Date')).toBeVisible();
    await expect(page.locator('#log-petrol')).toBeVisible();
    await expect(page.locator('#log-mileage')).toBeVisible();
    await expect(page.locator('#log-cost')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log Fill-Up' })).toBeVisible();
  });

  test('current vehicle name displayed with "Change in dashboard" link', async ({ page }) => {
    // The vehicle section shows the vehicle name and a link to change it
    await expect(page.getByRole('link', { name: /Change in dashboard/ })).toBeVisible();
  });

  test('happy path: fill form → confirmation card shows metrics', async ({ page }) => {
    await page.route('**/api/fills', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, json: MOCK_FILL_RESPONSE });
      }
      return route.continue();
    });

    await page.locator('#log-date').fill('2024-01-15');
    await page.locator('#log-petrol').fill('40');
    await page.locator('#log-mileage').fill('500');
    await page.locator('#log-cost').fill('80');
    await page.getByRole('button', { name: 'Log Fill-Up' }).click();

    // Confirmation card
    await expect(page.getByText('Fill-up saved')).toBeVisible({ timeout: 5_000 });
    // Metric tiles
    await expect(page.getByText('km/L')).toBeVisible();
    await expect(page.getByText('$/km')).toBeVisible();
    await expect(page.getByText('$/L')).toBeVisible();
    // Navigation options
    await expect(page.getByRole('button', { name: 'Log another' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to dashboard' })).toBeVisible();
  });

  test('"Log another" resets the form', async ({ page }) => {
    await page.route('**/api/fills', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, json: MOCK_FILL_RESPONSE });
      }
      return route.continue();
    });

    await page.locator('#log-petrol').fill('40');
    await page.locator('#log-mileage').fill('500');
    await page.locator('#log-cost').fill('80');
    await page.getByRole('button', { name: 'Log Fill-Up' }).click();
    await expect(page.getByText('Fill-up saved')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Log another' }).click();

    // Form visible again with cleared numeric fields
    await expect(page.locator('#log-petrol')).toBeVisible();
    await expect(page.locator('#log-petrol')).toHaveValue('');
    await expect(page.locator('#log-mileage')).toHaveValue('');
    await expect(page.locator('#log-cost')).toHaveValue('');
  });

  test('API error shows alert message', async ({ page }) => {
    await page.route('**/api/fills', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 422,
          json: { error: 'All fields must be positive numbers' },
        });
      }
      return route.continue();
    });

    await page.locator('#log-petrol').fill('40');
    await page.locator('#log-mileage').fill('500');
    await page.locator('#log-cost').fill('80');
    await page.getByRole('button', { name: 'Log Fill-Up' }).click();

    await expect(page.getByText('All fields must be positive numbers')).toBeVisible({ timeout: 5_000 });
  });

  test('network error shows connection error message', async ({ page }) => {
    await page.route('**/api/fills', async (route) => {
      if (route.request().method() === 'POST') {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.locator('#log-petrol').fill('40');
    await page.locator('#log-mileage').fill('500');
    await page.locator('#log-cost').fill('80');
    await page.getByRole('button', { name: 'Log Fill-Up' }).click();

    await expect(page.getByText(/network error/i)).toBeVisible({ timeout: 5_000 });
  });
});
