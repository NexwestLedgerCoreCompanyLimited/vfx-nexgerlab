import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { home, launch, stubFolderPicker } from '../helpers/app';

async function exportAs(
  format: RegExp,
  query: string,
  file: string,
  extra?: (p: import('@playwright/test').Page) => Promise<void>,
) {
  const out = mkdtempSync(join(tmpdir(), 'x-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await page.getByRole('searchbox').fill(query);
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Export now' }).click();
  await page.getByRole('button', { name: format }).click();
  await extra?.(page);
  await page.getByRole('button', { name: 'Choose a folder and export' }).click();
  await expect(page.getByRole('status')).toContainText('Exported', { timeout: 60_000 });
  await app.close();
  return join(out, file);
}

test('game pack holds parts, directions, normals, and a resolving manifest', async () => {
  test.setTimeout(120_000);
  const zip = await exportAs(/Game pack ZIP/, 'laser bolt', 'Laser bolt.zip', async (page) => {
    await page
      .getByRole('group', { name: 'Directions' })
      .getByRole('button', { name: '4', exact: true })
      .click();
    await page.getByRole('button', { name: 'Normal map', exact: true }).click();
  });
  const files = unzipSync(readFileSync(zip));
  const manifest = JSON.parse(strFromU8(files['manifest.json']!));
  for (const f of manifest.files) expect(files[f.path], f.path).toBeTruthy();
  expect(manifest.files.filter((f: { kind: string }) => f.kind === 'direction')).toHaveLength(4);
  for (const folder of [
    'whole/',
    'behind-sprite/',
    'in-front-sprite/',
    'parts/',
    'directions/S/',
    'normals/whole/',
  ]) {
    expect(
      Object.keys(files).some((p) => p.startsWith(folder)),
      folder,
    ).toBe(true);
  }
  expect(JSON.parse(strFromU8(files['metadata.json']!)).meta.vfxlab.directions.count).toBe(4);
});

test('game pack sibling formats write a GIF and an APNG', async () => {
  test.setTimeout(120_000);
  const gif = await exportAs(/^GIF/, 'pickups/coin-spin', 'Coin spin.gif');
  expect(readFileSync(gif).subarray(0, 6).toString('latin1')).toBe('GIF89a');
  const apng = await exportAs(/^APNG/, 'pickups/coin-spin', 'Coin spin.png');
  expect(readFileSync(apng).includes(Buffer.from('acTL'))).toBe(true);
  expect(statSync(apng).size).toBeGreaterThan(100);
});
