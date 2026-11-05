import { expect, test } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bench, home, launch, run, stubFolderPicker } from '../helpers/app';
import { listEffects } from '../../src/engine/effect-registry';
import { pngBytes } from '../helpers/images';

interface Bench {
  client: {
    render(
      p: unknown,
      f: number,
      o: unknown,
    ): Promise<{ frame: { pixels: Uint8ClampedArray } } | undefined>;
  };
  hashPixels(p: Uint8ClampedArray): string;
  createProjectFromEffect(id: string, i: object): unknown;
  exportFrameCount(p: unknown): number;
}

async function attached(query: string) {
  const parent = mkdtempSync(join(tmpdir(), 'fx-'));
  const sprite = join(mkdtempSync(join(tmpdir(), 'src-')), 'hero.png');
  writeFileSync(
    sprite,
    pngBytes(16, 16, () => [90, 90, 90, 255]),
  );
  const { app, page } = await launch();
  await stubFolderPicker(app, [parent, sprite]);
  await home(page);
  await page.getByRole('searchbox').fill(query);
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('tab', { name: 'Sprites' }).click();
  await page.getByRole('button', { name: 'Import sprite' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await page.getByRole('button', { name: 'Attach to effect' }).click();
  return { app, page, parent };
}

test('sprite effects add, change, and save with the project', async () => {
  const { app, page, parent } = await attached('campfire');
  await page.getByRole('button', { name: 'Add aura' }).click();
  await expect(page.getByLabel('Strength: Aura')).toBeVisible();
  await page.getByLabel('Strength: Aura').fill('0.5');
  await expect(page.getByRole('status')).toHaveText('Saved', { timeout: 5000 });
  const file = JSON.parse(readFileSync(join(parent, 'Campfire', 'project.vfxlab.json'), 'utf8'));
  expect(file.spriteAttachments[0].fx[0]).toMatchObject({ kind: 'aura', strength: 0.5 });
  await app.close();
});

test('sprite effects: custom character is offered only where tested', async () => {
  const off = await attached('campfire');
  await expect(
    off.page.getByRole('button', { name: 'Use as character for this effect' }),
  ).toBeDisabled();
  await expect(off.page.getByText('not tested with custom sprites')).toBeVisible();
  await off.app.close();
  const on = await attached('frozen');
  await on.page.getByRole('button', { name: 'Use as character for this effect' }).click();
  await expect(on.page.getByRole('button', { name: 'Used as character' })).toBeVisible();
  await on.app.close();
});

// Goldens come from Electron, the runtime that ships. Node's V8 uses a different sin and cos, so a few
// pixels round differently there. Upgrading Electron can do the same: rerun `npm run golden` and review.
test('sprite effects: all 244 effects match golden hashes in a real worker', async () => {
  test.setTimeout(120_000);
  const file = join(__dirname, '../fixtures/golden/effects.json');
  const { app, page } = await bench();
  const ids = listEffects().map((e) => e.id);
  const hashes = await run(
    page,
    async (list: string[]) => {
      const { client, hashPixels, createProjectFromEffect, exportFrameCount } = (
        window as never as { bench: Bench }
      ).bench;
      const out: Record<string, string[]> = {};
      for (const id of list) {
        const project = createProjectFromEffect(id, { name: 'golden', language: 'en' });
        const last = exportFrameCount(project) - 1;
        out[id] = [];
        for (const frame of [0, Math.floor(last / 2), last]) {
          const result = await client.render(project, frame, {
            partFilter: 'whole',
            includeStage: false,
          });
          out[id].push(hashPixels(result!.frame.pixels));
        }
      }
      return out;
    },
    ids,
  );
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, `${JSON.stringify(hashes)}\n`);
  expect(hashes).toEqual(JSON.parse(readFileSync(file, 'utf8')));
  await app.close();
});
