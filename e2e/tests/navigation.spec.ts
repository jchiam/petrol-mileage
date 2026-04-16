import { expect, test } from '@playwright/test';

test.describe('navigation', () => {
  test('nav links render on every route', async ({ page }) => {
    for (const path of ['/', '/log', '/admin/import']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
      // exact:true avoids matching "Log fill-up →" button on the dashboard
      await expect(page.getByRole('link', { name: 'Log fill-up', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Import', exact: true })).toBeVisible();
    }
  });

  test('logo "Petrol" links back to /', async ({ page }) => {
    await page.goto('/admin/import');
    await page.getByRole('link', { name: 'Petrol' }).click();
    await expect(page).toHaveURL('/');
  });

  test('active link highlighted on current route', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveClass(/bg-gray-100/);

    await page.goto('/log');
    await expect(page.getByRole('link', { name: 'Log fill-up' })).toHaveClass(/bg-gray-100/);

    await page.goto('/admin/import');
    await expect(page.getByRole('link', { name: 'Import' })).toHaveClass(/bg-gray-100/);
  });

  test('"Log fill-up →" button on dashboard links to /log', async ({ page }) => {
    await page.goto('/');
    const logBtn = page.getByRole('link', { name: /Log fill-up/ }).last();
    await expect(logBtn).toBeVisible();
    await expect(logBtn).toHaveAttribute('href', '/log');
  });
});
