import { expect, test } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { home, launch, stubFolderPicker } from '../helpers/app';

test('normal map previews and exports in step with the color sheet', async () => {
  const out = mkdtempSync(join(tmpdir(), 'x-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await page.getByRole('searchbox').fill('campfire');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Export now' }).click();
  await page.getByRole('button', { name: 'Normal map', exact: true }).click();
  await expect(page.getByLabel('Normal strength')).toBeVisible();
  await page.getByRole('button', { name: 'Choose a folder and export' }).click();
  await expect(page.getByRole('status')).toContainText('Exported 3 files', { timeout: 30_000 });
  const color = PNG.sync.read(readFileSync(join(out, 'Campfire.png')));
  const normal = PNG.sync.read(readFileSync(join(out, 'Campfire-normal.png')));
  expect([normal.width, normal.height]).toEqual([color.width, color.height]);
  for (let i = 3; i < color.data.length; i += 4 * 97) expect(normal.data[i]).toBe(color.data[i]);
  await app.close();
});
