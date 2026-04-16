/**
 * Void fill-up flow e2e tests.
 *
 * Stats, vehicles, and void API are fully mocked.
 */
import { expect, test } from '@playwright/test';

import { setupStatsMock, setupVehiclesMock, setupVoidMock } from '../helpers/routes';
import { makeFillRow, makeStats, makeVehicle } from '../mocks';

const FILL_ID = 99;

test.describe('void dialog', () => {
  test.beforeEach(async ({ page }) => {
    const fill = makeFillRow({ id: FILL_ID, pumpDate: '2024-01-15' });
    await setupVehiclesMock(page, [makeVehicle()]);
    await setupStatsMock(page, makeStats([fill]));
    await setupVoidMock(page, FILL_ID);
    await page.goto('/');
    await page.getByText('Latest km/L').waitFor({ timeout: 10_000 });
  });

  test('clicking void button opens dialog with fill details', async ({ page }) => {
    await page.getByRole('button', { name: 'Void & re-enter' }).click();

    const dialog = page.locator('.fixed.inset-0');
    await expect(dialog.getByRole('heading', { name: 'Void fill-up' })).toBeVisible();
    // Fill details shown in dialog body
    await expect(dialog.getByText('2024-01-15')).toBeVisible();
    await expect(dialog.getByText(/40\.000 L/)).toBeVisible();
    await expect(dialog.getByText(/\$80\.00/)).toBeVisible();
  });

  test('submit button disabled when reason is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Void & re-enter' }).click();

    // The submit button inside the dialog is the last "Void & re-enter" button
    const dialog = page.locator('.fixed.inset-0');
    await expect(dialog.getByRole('button', { name: 'Void & re-enter' })).toBeDisabled();
  });

  test('submit button enabled after entering reason', async ({ page }) => {
    await page.getByRole('button', { name: 'Void & re-enter' }).click();

    await page.locator('#void-reason').fill('Wrong mileage entered');

    const dialog = page.locator('.fixed.inset-0');
    await expect(dialog.getByRole('button', { name: 'Void & re-enter' })).toBeEnabled();
  });

  test('successful void shows success banner with "Log now" link', async ({ page }) => {
    await page.getByRole('button', { name: 'Void & re-enter' }).click();
    await page.locator('#void-reason').fill('Wrong mileage entered');

    const dialog = page.locator('.fixed.inset-0');
    await dialog.getByRole('button', { name: 'Void & re-enter' }).click();

    await expect(page.getByText(/Fill-up voided/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: 'Log now' })).toBeVisible();
  });

  test('cancel button closes dialog without voiding', async ({ page }) => {
    await page.getByRole('button', { name: 'Void & re-enter' }).click();
    await expect(page.getByRole('heading', { name: 'Void fill-up' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Void fill-up' })).not.toBeVisible();
  });

  test('API error shows error message in dialog', async ({ page }) => {
    // Override the void mock to return 409
    await page.route(`**/api/fills/${FILL_ID}/void`, (route) =>
      route.fulfill({
        status: 409,
        json: { error: 'Fill-up already voided' },
      }),
    );

    await page.getByRole('button', { name: 'Void & re-enter' }).click();
    await page.locator('#void-reason').fill('Already voided test');

    const dialog = page.locator('.fixed.inset-0');
    await dialog.getByRole('button', { name: 'Void & re-enter' }).click();

    await expect(page.getByText('Fill-up already voided')).toBeVisible({ timeout: 5_000 });
  });
});
