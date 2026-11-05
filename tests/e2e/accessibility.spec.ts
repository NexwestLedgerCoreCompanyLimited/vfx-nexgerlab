import { expect, test } from '@playwright/test';
import { home, launch } from '../helpers/app';

test('accessibility: no primary control clips at 1280x720', async () => {
  const { app, page } = await launch();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]!.setContentSize(1280, 720),
  );
  await home(page);
  await page.getByRole('searchbox').fill('ground pound');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  const box = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll('.bar button, .tools button, .tl-bar button')) {
      const r = el.getBoundingClientRect();
      if (r.right > innerWidth || r.bottom > innerHeight || r.width === 0)
        out.push(el.textContent ?? '');
    }
    return { out, scroll: document.documentElement.scrollWidth <= innerWidth };
  });
  expect(box).toEqual({ out: [], scroll: true });
  await app.close();
});

test('accessibility: keyboard reaches a tile and opens it', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.getByRole('searchbox').fill('campfire');
  await page.locator('.tile').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Open in Studio' })).toBeVisible();
  await app.close();
});

test('accessibility: icon buttons have names', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
  const unnamed = await page.evaluate(
    () =>
      [...document.querySelectorAll('button')].filter(
        (b) => !(b.getAttribute('aria-label') || b.textContent?.trim()),
      ).length,
  );
  expect(unnamed).toBe(0);
  await app.close();
});

test('accessibility: reduced motion keeps tiles still', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.locator('canvas').first().click();
  const tile = page.locator('.tile canvas').first();
  await tile.waitFor();
  await page.waitForTimeout(500);
  const a = await tile.screenshot();
  await page.waitForTimeout(500);
  expect((await tile.screenshot()).equals(a)).toBe(true);
  await app.close();
});
