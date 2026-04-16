/**
 * Dashboard e2e tests.
 *
 * Stats and vehicles APIs are fully mocked — assertions are deterministic
 * regardless of real fill or vehicle data.
 */
import { expect, test } from '@playwright/test';

import { setupStatsMock, setupVehiclesMock, setupVoidMock } from '../helpers/routes';
import { makeFillRow, makeStats, makeVehicle } from '../mocks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Navigate to dashboard and wait for KPI tiles. */
async function loadDashboard(page: Parameters<typeof setupStatsMock>[0], stats = makeStats()) {
  await setupVehiclesMock(page, [makeVehicle()]);
  await setupStatsMock(page, stats);
  await page.goto('/');
  await page.getByText('Latest km/L').waitFor({ timeout: 10_000 });
}

// ─── Empty state ──────────────────────────────────────────────────────────────

test('empty state shows prompt when no vehicles', async ({ page }) => {
  await setupVehiclesMock(page, []);
  await page.goto('/');
  await page.getByText('No vehicles set up yet').waitFor({ timeout: 10_000 });
  await expect(page.getByRole('link', { name: 'Import historical data' })).toBeVisible();
});

// ─── KPI tiles ────────────────────────────────────────────────────────────────

test.describe('KPI tiles', () => {
  test('tile labels visible', async ({ page }) => {
    await loadDashboard(page);

    await expect(page.getByText('Latest km/L')).toBeVisible();
    await expect(page.getByText('30-day avg km/L')).toBeVisible();
    await expect(page.getByText('Latest $/km')).toBeVisible();
    await expect(page.getByText('MTD spend')).toBeVisible();
  });

  test('values from mock stats', async ({ page }) => {
    await loadDashboard(page);

    // Mock returns latestKmPerL: 12.5, mtdSpend: 240.0
    // .first() because 12.50 also appears in the fills table km/L column
    await expect(page.getByText('12.50').first()).toBeVisible();
    await expect(page.getByText('$240.00')).toBeVisible();
  });
});

// ─── Forecast card ────────────────────────────────────────────────────────────

test('forecast card renders with expected value', async ({ page }) => {
  await loadDashboard(page);

  await expect(page.getByText('Next month')).toBeVisible();
  await expect(page.getByText('$310.00')).toBeVisible();
  await expect(page.getByText('Annual projection')).toBeVisible();
  await expect(page.getByText('$3720.00')).toBeVisible();
});

// ─── Fills table ──────────────────────────────────────────────────────────────

test.describe('fills table', () => {
  test('table headers and non-voided row visible', async ({ page }) => {
    const fill = makeFillRow({ id: 1, pumpDate: '2024-01-15' });
    await loadDashboard(page, makeStats([fill]));

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'km/L' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Cost' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Void & re-enter' })).toBeVisible();
  });

  test('voided fills hidden by default', async ({ page }) => {
    const fills = [
      makeFillRow({ id: 1, pumpDate: '2024-01-15', voidedAt: null }),
      makeFillRow({ id: 2, pumpDate: '2024-01-01', voidedAt: '2024-01-02T00:00:00.000Z' }),
    ];
    await loadDashboard(page, makeStats(fills));

    // Only 1 void button (for the non-voided row)
    await expect(page.getByRole('button', { name: 'Void & re-enter' })).toHaveCount(1);
    // exact:true avoids matching "Include voided rows" label
    await expect(page.getByText('voided', { exact: true })).not.toBeVisible();
  });

  test('voided fills shown when checkbox checked', async ({ page }) => {
    const fills = [
      makeFillRow({ id: 1, pumpDate: '2024-01-15', voidedAt: null }),
      makeFillRow({ id: 2, pumpDate: '2024-01-01', voidedAt: '2024-01-02T00:00:00.000Z' }),
    ];
    await loadDashboard(page, makeStats(fills));

    await page.getByLabel('Include voided rows').check();
    await expect(page.getByText('voided', { exact: true })).toBeVisible();
  });

  test('efficiency anomaly dot visible for flagged fill', async ({ page }) => {
    const fill = makeFillRow({
      id: 1,
      anomalies: [
        {
          type: 'efficiency',
          message: 'km/L of 5.0 is 3.2σ below recent average of 12.0',
          zScore: -3.2,
          mean: 12,
        },
      ],
    });
    await loadDashboard(page, makeStats([fill]));

    // AnomalyDot has aria-label matching the anomaly message
    await expect(page.locator('[aria-label*="km/L of"]')).toBeVisible();
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

test.describe('pagination', () => {
  // Generate 30 fills across Jan and Feb 2024
  function make30Fills() {
    return Array.from({ length: 30 }, (_, i) => {
      const month = Math.floor(i / 28) + 1;
      const day = (i % 28) + 1;
      return makeFillRow({
        id: i + 1,
        pumpDate: `2024-0${month}-${String(day).padStart(2, '0')}`,
      });
    });
  }

  test('prev disabled on page 1, next enabled', async ({ page }) => {
    await loadDashboard(page, makeStats(make30Fills()));

    const prev = page.getByRole('button', { name: '← Prev' });
    const next = page.getByRole('button', { name: 'Next →' });
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
  });

  test('navigating to page 2 enables prev, disables next', async ({ page }) => {
    await loadDashboard(page, makeStats(make30Fills()));

    await page.getByRole('button', { name: 'Next →' }).click();
    await expect(page.getByRole('button', { name: '← Prev' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Next →' })).toBeDisabled();
  });
});

// ─── Vehicle selector ─────────────────────────────────────────────────────────

test.describe('vehicle selector', () => {
  test('dropdown opens and closes on outside click', async ({ page }) => {
    await loadDashboard(page);

    const vehicleSelect = page.getByTestId('vehicle-select');
    await vehicleSelect.locator('button').first().click();

    // Dropdown (absolutely positioned list) should be visible
    await expect(vehicleSelect.locator('div[class*="absolute"]')).toBeVisible();

    // Click outside to close
    await page.mouse.click(10, 10);
    await expect(vehicleSelect.locator('div[class*="absolute"]')).not.toBeAttached();
  });

  test('selecting same vehicle still shows dashboard content', async ({ page }) => {
    await loadDashboard(page);

    const vehicleSelect = page.getByTestId('vehicle-select');
    await vehicleSelect.locator('button').first().click();

    // Click the first vehicle option button (the name button, not the star)
    await vehicleSelect
      .locator('div[class*="absolute"]')
      .locator('button[class*="flex-1"]')
      .first()
      .click();

    // Dashboard content still visible
    await expect(page.getByText('Latest km/L')).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Compare tab ──────────────────────────────────────────────────────────────

test('compare tab shows lifetime stats table', async ({ page }) => {
  // Mock all stats requests (compare tab fetches stats for every vehicle)
  await setupVehiclesMock(page, [makeVehicle()]);
  await page.route('**/api/fills/stats*', (route) => route.fulfill({ json: makeStats() }));
  await page.goto('/');
  await page.getByText('Latest km/L').waitFor({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Compare vehicles' }).click();
  await expect(page.getByText('All vehicles — lifetime')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('columnheader', { name: 'Vehicle' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'km/L (lifetime)' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Total spend' })).toBeVisible();
});

// ─── Set current vehicle ──────────────────────────────────────────────────────

test('star button calls set-current API (needs ≥2 vehicles)', async ({ page }) => {
  const vehicles = [
    makeVehicle({ id: 1, name: 'Car One', isCurrent: true }),
    makeVehicle({ id: 2, name: 'Car Two', isCurrent: false }),
  ];
  await setupVehiclesMock(page, vehicles);
  await setupStatsMock(page, makeStats());

  // Mock the set-current endpoint
  let setCurrCalled = false;
  await page.route('**/api/vehicles/*/set-current', (route) => {
    setCurrCalled = true;
    return route.fulfill({ status: 200, json: {} });
  });

  await page.goto('/');
  await page.getByText('Latest km/L').waitFor({ timeout: 10_000 });

  const vehicleSelect = page.getByTestId('vehicle-select');
  await vehicleSelect.locator('button').first().click();

  // Find a non-current star button (title = "Set as current car")
  const nonCurrentStar = vehicleSelect
    .locator('div[class*="absolute"]')
    .locator('button[title="Set as current car"]')
    .first();

  await nonCurrentStar.click();
  expect(setCurrCalled).toBe(true);
});

// ─── Void fill-up ─────────────────────────────────────────────────────────────
// (Detailed void-dialog tests live in dashboard-void.spec.ts)

test('void dialog opens from fills table', async ({ page }) => {
  const fill = makeFillRow({ id: 99 });
  await setupVoidMock(page, 99);
  await loadDashboard(page, makeStats([fill]));

  await page.getByRole('button', { name: 'Void & re-enter' }).click();
  await expect(page.getByRole('heading', { name: 'Void fill-up' })).toBeVisible();
});
