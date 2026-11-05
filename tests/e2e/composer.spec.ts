import { expect, test } from '@playwright/test';
import { home, launch } from '../helpers/app';

async function studio(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('searchbox').fill(query);
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
}

test('Composer shows understood and unsupported words and makes a version', async () => {
  const { app, page } = await launch();
  await home(page);
  await studio(page, 'campfire');
  const box = page.getByRole('textbox', { name: 'Tell the effect what to do' });
  await box.fill('blue dragons');
  await expect(page.getByText(/Understood: palette ice/)).toBeVisible();
  await expect(page.getByText(/Cannot do: dragons/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply as new version' }).click();
  await expect(page.getByText('blue dragons').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore: blue dragons' })).toBeVisible();
  await app.close();
});

test('Composer refuses a palette on a move and applies nothing', async () => {
  const { app, page } = await launch();
  await home(page);
  await studio(page, 'ground pound');
  await page.getByRole('textbox', { name: 'Tell the effect what to do' }).fill('in blue');
  await expect(page.getByText(/this effect has no palette/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply as new version' })).toBeDisabled();
  await app.close();
});
