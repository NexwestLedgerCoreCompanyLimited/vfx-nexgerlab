import { expect, test } from '@playwright/test';
import { home, launch } from '../helpers/app';

async function look(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('searchbox').fill(query);
  await page.locator('.tile').first().click();
  await expect(page.getByRole('button', { name: 'Open in Studio' })).toBeVisible();
}

test('Quick Look previews a palette and backdrop change', async () => {
  const { app, page } = await launch();
  await home(page);
  await look(page, 'campfire');
  await page.getByRole('button', { name: 'Pause' }).click();
  const stage = page.locator('canvas.stage');
  await page.waitForTimeout(200);
  const before = await stage.screenshot();
  await page.getByRole('button', { name: 'cyber' }).click();
  await page.waitForTimeout(300);
  expect((await stage.screenshot()).equals(before)).toBe(false);
  await page.getByRole('button', { name: 'Ground' }).click();
  await expect(page.getByRole('button', { name: 'Ground' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await app.close();
});

test('Quick Look builds controls from the effect and explains what is hidden', async () => {
  const { app, page } = await launch();
  await home(page);
  await look(page, 'campfire');
  await expect(page.getByLabel('Height')).toBeVisible();
  await page.getByRole('button', { name: /Back to library/ }).click();
  await look(page, 'ground pound');
  await expect(page.getByText('Palette is hidden')).toBeVisible();
  await expect(page.getByLabel('Height')).toHaveCount(0);
  await app.close();
});

test('Quick Look reaches export in two clicks from a tile', async () => {
  const { app, page } = await launch();
  await home(page);
  await look(page, 'campfire');
  await page.getByRole('button', { name: 'Export now' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Export');
  await app.close();
});
