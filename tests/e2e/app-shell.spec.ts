import { expect, test } from '@playwright/test';
import { launch } from '../helpers/app';

const BRIDGE = [
  'applyBackup',
  'createProject',
  'exportAbort',
  'exportBegin',
  'exportCommit',
  'exportName',
  'exportWrite',
  'getAppInfo',
  'getMcpConfig',
  'getPreferences',
  'importAsset',
  'importAssetBytes',
  'listRecentProjects',
  'markSplashSeen',
  'openProject',
  'pickAssetFile',
  'readAssetFrames',
  'readPickedAsset',
  'recoverProject',
  'removeAsset',
  'removeRecentProject',
  'saveProject',
  'setLanguage',
];

test('secure shell exposes only the typed bridge', async () => {
  const { app, page } = await launch();
  const probe = await page.evaluate(() => ({
    require: typeof (window as unknown as { require?: unknown }).require,
    process: typeof (window as unknown as { process?: unknown }).process,
    keys: Object.keys(window.vfxlab).sort(),
  }));
  expect(probe.require).toBe('undefined');
  expect(probe.process).toBe('undefined');
  expect(probe.keys).toEqual(BRIDGE);
  expect(await page.evaluate(() => window.vfxlab.getAppInfo())).toMatchObject({
    name: 'VFX NexgerLab',
  });
  await app.close();
});

test('language switches on the first-run choice and in Home without reload', async () => {
  const { app, page } = await launch();
  await page.locator('canvas').click();
  await page.getByRole('button', { name: 'ไทย', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('วันนี้อยากทำเอฟเฟกต์อะไร');
  await expect(page.getByRole('button', { name: 'สร้างใหม่' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'นำเข้าสไปรต์' })).toBeVisible();
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 7));
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What effect are you making today?',
  );
  expect(await page.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(7);
  await app.close();
});

test('language choice persists across launches', async () => {
  const first = await launch();
  await first.page.locator('canvas').click();
  await first.page.getByRole('button', { name: 'ไทย', exact: true }).click();
  await first.app.close();
  const second = await launch(first.profile);
  await second.page.locator('canvas').click();
  await expect(second.page.getByRole('heading', { level: 1 })).toHaveText(
    'วันนี้อยากทำเอฟเฟกต์อะไร',
  );
  await second.app.close();
});
