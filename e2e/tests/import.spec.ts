/**
 * Import wizard e2e tests.
 *
 * POST /api/admin/parse-import, POST /api/import, and GET /api/vehicles are
 * fully mocked for deterministic behavior.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import { setupVehiclesMock } from '../helpers/routes';
import { makeVehicle } from '../mocks';

// ─── Mock payloads ────────────────────────────────────────────────────────────

const CSV_CONTENT = fs.readFileSync(path.join(__dirname, '../fixtures/fills.csv'), 'utf-8');

const MOCK_PARSE_RESULT = [
  {
    sheetName: 'Sheet1',
    rows: [
      {
        sheetRow: 1,
        pump_date: '2024-01-01',
        petrol_l: 40.0,
        mileage_km: 500.0,
        cost: 80.0,
        valid: true,
      },
      {
        sheetRow: 2,
        pump_date: '2024-01-15',
        petrol_l: 42.0,
        mileage_km: 520.0,
        cost: 84.0,
        valid: true,
      },
      {
        sheetRow: 3,
        pump_date: '',
        petrol_l: null,
        mileage_km: null,
        cost: null,
        valid: false,
        invalidReason: 'Unparseable date: ""',
      },
    ],
    detectedColumns: {
      pumpDate: 'Pump Date',
      petrolL: 'Petrol (L)',
      mileageKm: 'Mileage (km)',
      cost: 'Cost',
    },
  },
];

const MOCK_PARSE_MULTI_SHEET = [
  {
    sheetName: '2023',
    rows: [
      {
        sheetRow: 1,
        pump_date: '2023-06-01',
        petrol_l: 40.0,
        mileage_km: 500.0,
        cost: 80.0,
        valid: true,
      },
    ],
    detectedColumns: {
      pumpDate: 'Pump Date',
      petrolL: 'Petrol (L)',
      mileageKm: 'Mileage (km)',
      cost: 'Cost',
    },
  },
  {
    sheetName: '2024',
    rows: [
      {
        sheetRow: 1,
        pump_date: '2024-01-01',
        petrol_l: 42.0,
        mileage_km: 520.0,
        cost: 84.0,
        valid: true,
      },
    ],
    detectedColumns: {
      pumpDate: 'Pump Date',
      petrolL: 'Petrol (L)',
      mileageKm: 'Mileage (km)',
      cost: 'Cost',
    },
  },
];

const MOCK_IMPORT_RESULT = { inserted: 2, skipped: 0, errors: [] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupImportMocks(page: Page, parseResult = MOCK_PARSE_RESULT) {
  await page.route('**/api/admin/parse-import', (route) => route.fulfill({ json: parseResult }));
  await page.route('**/api/import', (route) => route.fulfill({ json: MOCK_IMPORT_RESULT }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('create vehicle form (no vehicles)', () => {
  test('shows create-vehicle form when no vehicles', async ({ page }) => {
    await setupVehiclesMock(page, []);
    await page.goto('/admin/import');
    await expect(
      page.getByPlaceholder('Display name (required, e.g. My Honda City)'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('create vehicle form submit calls POST /api/vehicles', async ({ page }) => {
    await setupVehiclesMock(page, []);
    await page.goto('/admin/import');
    await expect(
      page.getByPlaceholder('Display name (required, e.g. My Honda City)'),
    ).toBeVisible({ timeout: 10_000 });

    await page.route('**/api/vehicles', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          json: { id: 42, name: 'My Test Car', isActive: true, isCurrent: false },
        });
      }
      return route.continue();
    });

    await page.getByPlaceholder('Display name (required, e.g. My Honda City)').fill('My Test Car');
    await page.getByRole('button', { name: 'Create vehicle' }).click();

    // After creation, vehicle select should appear (upload zone visible)
    await expect(page.getByTestId('vehicle-select')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('file upload and import flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupVehiclesMock(page, [makeVehicle()]);
    await setupImportMocks(page);
    await page.goto('/admin/import');
    await page.getByTestId('vehicle-select').waitFor({ timeout: 10_000 });
  });

  test('upload zone renders with correct description', async ({ page }) => {
    await expect(page.getByTestId('upload-zone')).toBeVisible();
    await expect(page.getByText(/\.xlsx.*\.csv/)).toBeVisible();
  });

  test('file upload shows preview table with row count', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('upload-zone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'fills.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_CONTENT),
    });

    // Preview table renders — shows "X of Y rows selected"
    await expect(page.getByText(/of.*rows selected/)).toBeVisible({ timeout: 5_000 });
    // 2 valid + 1 invalid = 3 total, 2 selected by default
    await expect(page.getByText(/2.*of.*3.*rows selected/)).toBeVisible();
  });

  test('invalid rows shown with red styling and disabled checkbox', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('upload-zone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'fills.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_CONTENT),
    });

    await expect(page.getByText(/of.*rows selected/)).toBeVisible({ timeout: 5_000 });
    // Invalid rows are red
    await expect(page.locator('[class*="bg-red-50"]')).toBeVisible();
    // Invalid row's checkbox is disabled
    await expect(page.locator('input[type="checkbox"][disabled]')).toBeVisible();
    // The invalid reason is shown
    await expect(page.getByText(/Unparseable date/)).toBeVisible();
  });

  test('import button shows selected count, triggers POST /api/import', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('upload-zone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'fills.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_CONTENT),
    });

    await expect(page.getByText(/of.*rows selected/)).toBeVisible({ timeout: 5_000 });

    // Import button label shows selected count (2 valid rows)
    await expect(page.getByRole('button', { name: 'Import 2 rows' })).toBeVisible();
    await page.getByRole('button', { name: 'Import 2 rows' }).click();

    // Success screen
    await expect(page.getByText('2 fill-ups imported')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import another file' })).toBeVisible();
  });

  test('"Import another file" resets to upload step', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('upload-zone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'fills.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_CONTENT),
    });

    await expect(page.getByText(/of.*rows selected/)).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Import 2 rows' }).click();
    await expect(page.getByText('2 fill-ups imported')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Import another file' }).click();
    await expect(page.getByTestId('upload-zone')).toBeVisible();
  });
});

test.describe('multi-sheet import', () => {
  test('shows sheet tabs and "import all" button for multi-sheet file', async ({ page }) => {
    await setupVehiclesMock(page, [makeVehicle()]);
    await setupImportMocks(page, MOCK_PARSE_MULTI_SHEET);
    await page.goto('/admin/import');
    await page.getByTestId('vehicle-select').waitFor({ timeout: 10_000 });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('upload-zone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'multi.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('dummy'),
    });

    await expect(page.getByText(/of.*rows selected/)).toBeVisible({ timeout: 5_000 });

    // Sheet tab buttons visible
    await expect(page.getByRole('button', { name: '2023' })).toBeVisible();
    await expect(page.getByRole('button', { name: '2024' })).toBeVisible();

    // "Import all sheets (N rows)" button visible
    await expect(page.getByRole('button', { name: /Import all sheets/ })).toBeVisible();
  });
});

test.describe('"+ Add vehicle" in import wizard', () => {
  test('creates vehicle and it appears in selector', async ({ page }) => {
    await setupVehiclesMock(page, [makeVehicle()]);
    await setupImportMocks(page);
    await page.goto('/admin/import');
    await page.getByTestId('vehicle-select').waitFor({ timeout: 10_000 });

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
    await expect(
      page.getByPlaceholder('Display name (required, e.g. My Honda City)'),
    ).toBeVisible();

    await page
      .getByPlaceholder('Display name (required, e.g. My Honda City)')
      .fill('New Import Car');
    await page.getByRole('button', { name: 'Create vehicle' }).click();

    // The new vehicle should appear in the selector
    await expect(page.getByTestId('vehicle-select')).toContainText('New Import Car');
  });
});
