import { expect, test } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { home, launch, stubFolderPicker } from '../helpers/app';
import { pngBytes } from '../helpers/images';

async function studio(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('searchbox').fill(query);
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
}

test('editor workflow edits, undoes, saves, autosaves, and reopens', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'wf-'));
  const { app, page, profile } = await launch();
  await stubFolderPicker(app, [parent]);
  await home(page);
  await studio(page, 'campfire');

  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByLabel('Light strength').fill('0.5');
  await expect(page.getByLabel('Light strength')).toHaveValue('0.5');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('Light strength')).toHaveValue('1');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByLabel('Light strength')).toHaveValue('0.5');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');

  await page.getByRole('button', { name: 'Flip left and right' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved', { timeout: 4000 });
  const file = JSON.parse(readFileSync(join(parent, 'Campfire', 'project.vfxlab.json'), 'utf8'));
  expect(file.layers[0]).toMatchObject({ flip: true, light: 0.5 });
  await app.close();

  const again = await launch(profile);
  await again.page.locator('canvas').first().click();
  await again.page.getByRole('button', { name: 'Campfire', exact: true }).click();
  await expect(again.page.getByLabel('Light strength')).toHaveValue('0.5');
  await again.app.close();
});

test('editor workflow imports and attaches a sprite across frames', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'wf-'));
  const sprite = join(mkdtempSync(join(tmpdir(), 'src-')), 'hero.png');
  writeFileSync(
    sprite,
    pngBytes(16, 16, () => [255, 255, 255, 255]),
  );
  const { app, page } = await launch();
  await stubFolderPicker(app, [parent, sprite]);
  await home(page);
  await studio(page, 'campfire');
  await page.getByRole('tab', { name: 'Sprites' }).click();
  await page.getByRole('button', { name: 'Import sprite' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await page.getByRole('button', { name: 'Attach to effect' }).click();
  await expect(page.getByLabel('Anchor X')).toBeVisible();
  await page.getByLabel('Anchor X').fill('20');
  await expect(page.getByLabel('Anchor X')).toHaveValue('20');
  await app.close();
});

test('editor workflow shows the act lane and undoes a timing edit in one step', async () => {
  const { app, page } = await launch();
  await home(page);
  await studio(page, 'ground pound');
  await expect(page.getByRole('group', { name: 'Act' })).toContainText('Freeze');
  const freeze = page.getByLabel('Freeze on hit');
  await freeze.fill('0.3');
  await expect(page.getByText('300 ms')).toBeVisible();
  await freeze.dispatchEvent('pointerup');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('200 ms')).toBeVisible();
  await app.close();
});

test('editor workflow warns about Thai in a bitmap text option', async () => {
  const { app, page } = await launch();
  await home(page);
  await studio(page, 'level up');
  await page.getByLabel('Text').fill('เลเวล');
  await expect(page.getByText('This font has no glyphs')).toBeVisible();
  await app.close();
});
