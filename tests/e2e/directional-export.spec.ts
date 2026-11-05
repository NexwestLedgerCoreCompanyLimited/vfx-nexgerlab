import { expect, test } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { DIRECTION_ORDER } from '../../src/shared/directions';
import { home, launch, stubFolderPicker } from '../helpers/app';

test.describe.configure({ timeout: 120_000 });

for (const count of [4, 8, 16] as const) {
  test(`directional export writes ${count} ordered rows`, async () => {
    const out = mkdtempSync(join(tmpdir(), 'x-'));
    const { app, page } = await launch();
    await stubFolderPicker(app, [out]);
    await home(page);
    await page.getByRole('searchbox').fill('laser bolt');
    await page.locator('.tile').first().click();
    await page.getByRole('button', { name: 'Export now' }).click();
    await page
      .getByRole('group', { name: 'Directions' })
      .getByRole('button', { name: String(count), exact: true })
      .click();
    await page.getByRole('button', { name: 'Choose a folder and export' }).click();
    await expect(page.getByRole('status')).toContainText('Exported', { timeout: 100_000 });
    const json = JSON.parse(readFileSync(join(out, 'Laser bolt.json'), 'utf8'));
    const { w, h } = json.frames[0].frame;
    expect(w).toBe(h);
    expect(json.meta.vfxlab.directions.order).toEqual(DIRECTION_ORDER[count]);
    const frames = json.meta.vfxlab.frames;
    const png = PNG.sync.read(readFileSync(join(out, 'Laser bolt.png')));
    expect([png.width, png.height]).toEqual([w * frames, h * count]);
    expect(json.frames[frames]).toMatchObject({
      direction: DIRECTION_ORDER[count][1],
      frame: { x: 0, y: h },
    });
    await app.close();
  });
}

test('directional export applies a Studio override and it survives reopening', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'd-'));
  const { app, page, profile } = await launch();
  await stubFolderPicker(app, [parent]);
  await home(page);
  await page.getByRole('searchbox').fill('laser bolt');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page
    .getByRole('group', { name: 'Directions' })
    .getByRole('button', { name: '4', exact: true })
    .click();
  await page.getByLabel('Direction to edit').selectOption('W');
  await page
    .getByRole('group', { name: 'Speed override' })
    .getByRole('button', { name: '2×' })
    .click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await app.close();

  const again = await launch(profile);
  await again.page.locator('canvas').first().click();
  await again.page.getByRole('button', { name: 'Laser bolt', exact: true }).click();
  await expect(
    again.page.getByLabel('Direction to edit').locator('option', { hasText: 'W *' }),
  ).toHaveCount(1);
  await again.page.getByLabel('Direction to edit').selectOption('W');
  await again.page.getByRole('button', { name: 'Reset this direction' }).click();
  await expect(
    again.page.getByLabel('Direction to edit').locator('option', { hasText: 'W *' }),
  ).toHaveCount(0);
  await again.app.close();
});
