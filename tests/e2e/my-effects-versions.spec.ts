import { expect, test } from '@playwright/test';
import { home, launch } from '../helpers/app';

test('My Effects saves, searches, and applies; versions branch and restore', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.getByRole('searchbox').fill('campfire');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();

  await page.getByRole('textbox', { name: 'Preset name' }).fill('ไฟของฉัน');
  await page.getByRole('button', { name: 'Save preset' }).click();
  await page.getByRole('searchbox', { name: 'Search My Effects' }).fill('ของฉัน');
  await page.getByRole('button', { name: 'Add: ไฟของฉัน' }).click();
  await expect(page.locator('.layer-row')).toHaveCount(2);

  await page.getByRole('button', { name: 'Restore: Start' }).click();
  await expect(page.locator('.layer-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Branch: Start' }).click();
  await expect(page.getByRole('button', { name: 'Restore: Start +' })).toBeVisible();
  await app.close();
});
