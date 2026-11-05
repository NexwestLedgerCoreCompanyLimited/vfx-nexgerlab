import { expect, test } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch } from '../helpers/app';
import { pngBytes } from '../helpers/images';

test('asset import round-trips through a saved project offline', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'e2e-'));
  const file = join(mkdtempSync(join(tmpdir(), 'src-')), 'ฮีโร่.png');
  writeFileSync(
    file,
    pngBytes(8, 8, () => [10, 20, 30, 255]),
  );
  const { app, page } = await launch();
  await app.evaluate(
    ({ dialog }, dirs) => {
      let call = 0;
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [dirs[call++]!],
      })) as typeof dialog.showOpenDialog;
    },
    [parent, file],
  );
  const result = await page.evaluate(async () => {
    const handle = (await window.vfxlab.createProject('โปรเจกต์'))!;
    await window.vfxlab.pickAssetFile();
    const ref = await window.vfxlab.importAsset(handle);
    const project = { ...handle.project, assets: [ref] };
    await window.vfxlab.saveProject(handle.path, project);
    const reopened = (await window.vfxlab.openProject(handle.path))!;
    const frames = await window.vfxlab.readAssetFrames(handle.path, reopened.project.assets[0]!);
    return {
      name: reopened.project.assets[0]!.originalName,
      missing: reopened.missingAssets,
      pixel: Array.from(frames[0]!.rgba.slice(0, 4)),
    };
  });
  expect(result).toEqual({ name: 'ฮีโร่.png', missing: [], pixel: [10, 20, 30, 255] });
  await app.close();
});

test('the renderer cannot save to an unknown folder', async () => {
  const { app, page } = await launch();
  const error = await page.evaluate(() =>
    window.vfxlab
      .saveProject('/tmp/not-opened', {} as never)
      .then(() => 'saved')
      .catch((e: Error) => e.message),
  );
  expect(error).toContain('Unknown project path');
  await app.close();
});
