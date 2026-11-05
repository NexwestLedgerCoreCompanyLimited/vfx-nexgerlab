import { expect, test } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { home, launch, stubFolderPicker } from '../helpers/app';

test('crash recovery restores the last good project after the file is damaged', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'cr-'));
  const { app, page, profile } = await launch();
  await stubFolderPicker(app, [parent]);
  await home(page);
  await page.getByRole('searchbox').fill('campfire');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.getByRole('button', { name: 'Flip left and right' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved', { timeout: 4000 });
  await app.close();

  writeFileSync(join(parent, 'Campfire', 'project.vfxlab.json'), '{"schemaVersion":1,');

  const again = await launch(profile);
  await again.page.locator('canvas').first().click();
  await again.page.getByRole('button', { name: 'Campfire', exact: true }).click();
  await expect(again.page.getByRole('alert')).toContainText('damaged');
  await again.page.getByRole('button', { name: 'Restore backup' }).click();
  await expect(again.page.getByRole('heading', { level: 2 })).toBeVisible();
  await again.app.close();
});
