import { expect, test } from '@playwright/test';
import { launch } from '../helpers/app';

const chooser = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'English', exact: true });

test('splash plays through to Home on first launch', async () => {
  const { app, page } = await launch();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(chooser(page)).toBeVisible({ timeout: 6000 });
  await expect(page.locator('canvas')).toHaveCount(0);
  await app.close();
});

test('any click skips the splash at once', async () => {
  const { app, page } = await launch();
  await page.locator('canvas').click();
  await expect(chooser(page)).toBeVisible({ timeout: 300 });
  await app.close();
});

test('any key skips the splash at once', async () => {
  const { app, page } = await launch();
  await expect(page.locator('canvas')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(chooser(page)).toBeVisible({ timeout: 300 });
  await app.close();
});

test('later launches run the short version', async () => {
  const first = await launch();
  await first.page.locator('canvas').click();
  await chooser(first.page).click();
  await first.app.close();
  const second = await launch(first.profile);
  const t0 = Date.now();
  await expect(second.page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 4000 });
  expect(Date.now() - t0).toBeLessThan(1600);
  await second.app.close();
});

test('reduced motion shows the still frame and no animation loop', async () => {
  const { app, page } = await launch();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-static', 'true');
  await canvas.click();
  await expect(chooser(page)).toBeVisible();
  await app.close();
});
