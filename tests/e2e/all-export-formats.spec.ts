import { expect, test } from '@playwright/test';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { home, launch, stubFolderPicker } from '../helpers/app';

test('all export formats finish from one project and open as real files', async () => {
  test.setTimeout(120_000);
  const out = mkdtempSync(join(tmpdir(), 'all-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await page.getByRole('searchbox').fill('pickups/coin-spin');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Export now' }).click();
  const names: Array<[RegExp, string]> = [
    [/^Sprite sheet/, 'sheet'],
    [/^GIF/, 'gif'],
    [/^APNG/, 'apng'],
    [/^PNG sequence/, 'seq'],
    [/^Game pack ZIP/, 'pack'],
  ];
  for (const [format, name] of names) {
    await page.getByRole('button', { name: format }).click();
    await page.getByLabel('File name').fill(name);
    await page.getByRole('button', { name: 'Choose a folder and export' }).click();
    await expect(page.getByRole('status')).toContainText('Exported', { timeout: 30_000 });
    await page.getByLabel('File name').fill(`${name}-done`);
  }
  expect(readdirSync(out).sort()).toEqual(
    ['apng.png', 'gif.gif', 'pack.zip', 'seq', 'sheet.json', 'sheet.png'].sort(),
  );
  await app.close();
});
