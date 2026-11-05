import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { home, launch, stubFolderPicker } from '../helpers/app';

async function openExport(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('searchbox').fill(query);
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Export now' }).click();
  await expect(page.getByRole('button', { name: 'Choose a folder and export' })).toBeVisible();
}
const run = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Choose a folder and export' }).click();

test('PNG export: three clicks from a tile write a transparent sheet and JSON', async () => {
  const out = mkdtempSync(join(tmpdir(), 'x-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await page.getByRole('searchbox').fill('campfire');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Export now' }).click();
  await run(page);
  await expect(page.getByRole('status')).toContainText('Exported 2 files');
  const png = PNG.sync.read(readFileSync(join(out, 'Campfire.png')));
  const json = JSON.parse(readFileSync(join(out, 'Campfire.json'), 'utf8'));
  expect([png.width, png.height]).toEqual([json.meta.size.w, json.meta.size.h]);
  expect(json.frames).toHaveLength(90);
  expect(png.data[3]).toBe(0);
  expect(png.data.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
  await app.close();
});

test('PNG export: a sequence writes one file per frame under a direction folder', async () => {
  const out = mkdtempSync(join(tmpdir(), 'x-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await openExport(page, 'fire/fireball');
  await page.getByRole('button', { name: /PNG sequence/ }).click();
  await run(page);
  await expect(page.getByRole('status')).toContainText('Exported');
  expect(readdirSync(join(out, 'Fireball', 'S'))[0]).toBe('0001.png');
  await app.close();
});

test('PNG export: keeps Thai file names', async () => {
  const out = mkdtempSync(join(tmpdir(), 'x-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await openExport(page, 'coin spin');
  await page.getByLabel('File name').fill('เหรียญ/ทอง');
  await run(page);
  await expect(page.getByRole('status')).toContainText('Exported');
  expect(existsSync(join(out, 'เหรียญ ทอง.png'))).toBe(true);
  await app.close();
});

test('PNG export: refuses to overwrite unless confirmed, and leaves no temp folder', async () => {
  const out = mkdtempSync(join(tmpdir(), 'x-'));
  writeFileSync(join(out, 'Candle.png'), 'old');
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await openExport(page, 'candle');
  page.once('dialog', (d) => void d.dismiss());
  await run(page);
  await expect(page.getByRole('button', { name: 'Choose a folder and export' })).toBeVisible();
  await page.waitForTimeout(300);
  expect(readFileSync(join(out, 'Candle.png'), 'utf8')).toBe('old');
  expect(readdirSync(out)).toEqual(['Candle.png']);
  page.once('dialog', (d) => void d.accept());
  await run(page);
  await expect(page.getByRole('status')).toContainText('Exported');
  expect(readFileSync(join(out, 'Candle.png'))[0]).toBe(137);
  await app.close();
});

test('PNG export: cancel leaves nothing behind', async () => {
  const out = mkdtempSync(join(tmpdir(), 'x-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await openExport(page, 'big explosion');
  await run(page);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: 'Choose a folder and export' })).toBeVisible();
  await page.waitForTimeout(300);
  expect(readdirSync(out)).toEqual([]);
  await app.close();
});
