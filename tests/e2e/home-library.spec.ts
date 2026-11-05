import { expect, test } from '@playwright/test';
import { home, launch } from '../helpers/app';

test('Home library shows real counts and filters by category', async () => {
  const { app, page } = await launch();
  await home(page);
  await expect(page.getByRole('button', { name: /All\s*244/ })).toBeVisible();
  await page.getByRole('button', { name: /^Ice\s*10/ }).click();
  await expect(page.locator('.tile')).toHaveCount(10);
  await page.getByRole('button', { name: /^All/ }).click();
  await expect(page.locator('.tile')).toHaveCount(244);
  await app.close();
});

test('Home search finds English names and Thai category names', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.getByRole('searchbox').fill('campfire');
  await expect(page.locator('.tile')).toHaveCount(1);
  await page.getByRole('searchbox').fill('zzzz');
  await expect(page.getByText('Nothing matches')).toBeVisible();
  await page.getByRole('button', { name: 'ไทย', exact: true }).click();
  await page.getByRole('searchbox').fill('น้ำแข็ง');
  await expect(page.locator('.tile')).toHaveCount(10);
  await app.close();
});

test('Home tiles animate while visible', async () => {
  const { app, page } = await launch();
  await home(page);
  const tile = page.locator('.tile canvas').first();
  await page.waitForTimeout(800);
  const a = await tile.screenshot();
  await page.waitForTimeout(800);
  const b = await tile.screenshot();
  expect(a.equals(b)).toBe(false);
  await app.close();
});

test('Home scrolls without long main-thread frames', async () => {
  const { app, page } = await launch();
  await home(page);
  const result = await page.evaluate(async () => {
    const long: number[] = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) long.push(e.duration);
    }).observe({ type: 'longtask' });
    const area = document.querySelector('.home')!;
    let raf = 0;
    const count = () => {
      raf++;
      requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    for (let i = 0; i < 120; i++) {
      area.scrollTop += 40;
      await new Promise((done) => setTimeout(done, 16));
    }
    await new Promise((done) => setTimeout(done, 200));
    return { long, raf, top: area.scrollTop, visibility: document.visibilityState };
  });
  console.log('SCROLL', JSON.stringify(result));
  expect(result.top).toBeGreaterThan(1000);
  expect(Math.max(0, ...result.long)).toBeLessThan(100);
  await app.close();
});
