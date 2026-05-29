/**
 * Import wizard e2e tests — critical journeys only.
 *
 * Empty state, preview table, upload zone, reset, etc. live as component tests.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import { setupVehiclesMock } from '../helpers/routes';
import { makeVehicle } from '../mocks';

const CSV_CONTENT = fs.readFileSync(path.join(__dirname, '../fixtures/fills.csv'), 'utf-8');

const MOCK_PARSE_RESULT = [
  {
    sheetName: 'Sheet1',
    rows: [
      { sheetRow: 1, pump_date: '2024-01-01', petrol_l: 40.0, mileage_km: 500.0, cost: 80.0, valid: true },
      { sheetRow: 2, pump_date: '2024-01-15', petrol_l: 42.0, mileage_km: 520.0, cost: 84.0, valid: true },
    ],
    detectedColumns: { pumpDate: 'Pump Date', petrolL: 'Petrol (L)', mileageKm: 'Mileage (km)', cost: 'Cost' },
  },
];

const MOCK_PARSE_MULTI_SHEET = [
  {
    sheetName: '2023',
    rows: [{ sheetRow: 1, pump_date: '2023-06-01', petrol_l: 40, mileage_km: 500, cost: 80, valid: true }],
    detectedColumns: { pumpDate: 'Pump Date', petrolL: 'Petrol (L)', mileageKm: 'Mileage (km)', cost: 'Cost' },
  },
  {
    sheetName: '2024',
    rows: [{ sheetRow: 1, pump_date: '2024-01-01', petrol_l: 42, mileage_km: 520, cost: 84, valid: true }],
    detectedColumns: { pumpDate: 'Pump Date', petrolL: 'Petrol (L)', mileageKm: 'Mileage (km)', cost: 'Cost' },
  },
];

const MOCK_IMPORT_RESULT = { inserted: 2, skipped: 0, errors: [] };

async function setupImportMocks(page: Page, parseResult: unknown = MOCK_PARSE_RESULT) {
  await page.route('**/api/admin/parse-import', (route) => route.fulfill({ json: parseResult }));
  await page.route('**/api/import', (route) => route.fulfill({ json: MOCK_IMPORT_RESULT }));
}

test('file upload → preview → import → done', async ({ page }) => {
  await setupVehiclesMock(page, [makeVehicle()]);
  await setupImportMocks(page);
  await page.goto('/admin/import');
  await page.getByTestId('vehicle-select').waitFor();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('upload-zone').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'fills.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV_CONTENT),
  });

  await expect(page.getByText(/of.*rows selected/)).toBeVisible();
  await page.getByRole('button', { name: 'Import 2 rows' }).click();

  await expect(page.getByText('2 fill-ups imported')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible();
});

test('multi-sheet file shows sheet tabs and "import all" button', async ({ page }) => {
  await setupVehiclesMock(page, [makeVehicle()]);
  await setupImportMocks(page, MOCK_PARSE_MULTI_SHEET);
  await page.goto('/admin/import');
  await page.getByTestId('vehicle-select').waitFor();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('upload-zone').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'multi.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('dummy'),
  });

  await expect(page.getByText(/of.*rows selected/)).toBeVisible();
  await expect(page.getByRole('button', { name: '2023' })).toBeVisible();
  await expect(page.getByRole('button', { name: '2024' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Import all sheets/ })).toBeVisible();
});

test('"+ Add vehicle" creates vehicle and selects it', async ({ page }) => {
  await setupVehiclesMock(page, [makeVehicle()]);
  await setupImportMocks(page);
  await page.goto('/admin/import');
  await page.getByTestId('vehicle-select').waitFor();

  await page.route('**/api/vehicles', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        json: { id: 99, name: 'New Import Car', isActive: true, isCurrent: false },
      });
    }
    return route.continue();
  });

  await page.getByRole('button', { name: '+ Add vehicle' }).click();
  await page
    .getByPlaceholder('Display name (required, e.g. My Honda City)')
    .fill('New Import Car');
  await page.getByRole('button', { name: 'Create vehicle' }).click();

  await expect(page.getByTestId('vehicle-select')).toContainText('New Import Car');
});
