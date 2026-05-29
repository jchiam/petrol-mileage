/**
 * Navigation e2e tests — smoke coverage of cross-page links.
 * Detail tests (active-link highlighting, individual hrefs) live as
 * component tests against <AppNav>.
 */
import { expect, test } from '@playwright/test';

test.describe('navigation', () => {
  test('nav links render on every route', async ({ page }) => {
    for (const path of ['/', '/log', '/admin/import']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Log fill-up', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Import', exact: true })).toBeVisible();
    }
  });

  test('logo "Petrol" links back to /', async ({ page }) => {
    await page.goto('/admin/import');
    await expect(page.getByRole('link', { name: 'Petrol' })).toHaveAttribute('href', '/');
  });
});
