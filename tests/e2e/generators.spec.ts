import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { encodeAseprite } from '../../src/engine/exporters/aseprite';
import { home, launch, stubFolderPicker } from '../helpers/app';

test('characters preview and export every animation', async () => {
  const out = mkdtempSync(join(tmpdir(), 'c-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await page.getByRole('button', { name: 'Characters', exact: true }).click();
  await expect(page.getByRole('img', { name: 'S', exact: true })).toBeVisible();
  await page.getByLabel('Describe your character').fill('wizard dragon');
  await expect(page.getByText('Unknown word: dragon')).toBeVisible();
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await page.getByRole('button', { name: 'Export all animations' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  expect(readdirSync(join(out, 'wizard')).sort()).toContain('walk.png');
  expect(existsSync(join(out, 'wizard', 'attack.gif'))).toBe(true);
  await app.close();
});

test('maps generate, paint, and export 3D', async () => {
  const out = mkdtempSync(join(tmpdir(), 'm-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await page.getByRole('button', { name: 'Maps', exact: true }).click();
  const map = page.locator('canvas.map-canvas');
  await expect(map).toBeVisible();
  await page.waitForTimeout(200);
  const before = await map.screenshot();
  const box = (await map.boundingBox())!;
  await page.getByRole('button', { name: 'Rock' }).click();
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 60, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect((await map.screenshot()).equals(before)).toBe(false);
  await page.getByRole('button', { name: '3D voxel' }).click();
  await page.getByRole('button', { name: 'Export map' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  expect(readdirSync(join(out, 'map')).sort()).toEqual(
    ['map.glb', 'map.obj', 'map.png', 'map.tmj', 'tileset.png', 'wang-grass-sand.png'].sort(),
  );
  await app.close();
});

test('Connect AI shows settings that really start the server', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.getByRole('button', { name: 'Connect AI' }).click();
  await expect(page.getByLabel('MCP settings')).toContainText('mcpServers');
  const text = await page.getByLabel('MCP settings').textContent();
  const server = JSON.parse(text!).mcpServers['vfx-nexgerlab'];
  await app.close();
  const output = mkdtempSync(join(tmpdir(), 'mcp-'));
  const child = spawn(server.command, server.args, {
    env: { ...process.env, ...server.env, VFXLAB_MCP_OUTPUT: output },
  });
  const reply = await new Promise<string>((resolve) => {
    child.stdout.on('data', (d) => resolve(String(d)));
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })}\n`);
  });
  child.kill();
  expect(JSON.parse(reply).result.tools.length).toBeGreaterThan(5);
});

test('import reads JPEG-like and Aseprite files into a project', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'i-'));
  const dir = mkdtempSync(join(tmpdir(), 'src-'));
  const ase = join(dir, 'hero.aseprite');
  const px = new Uint8ClampedArray(4 * 4 * 4).fill(200);
  writeFileSync(
    ase,
    encodeAseprite(
      [
        { width: 4, height: 4, pixels: px },
        { width: 4, height: 4, pixels: px },
      ],
      [100, 100],
    ),
  );
  const webp = join(dir, 'hero.webp');
  const { app, page } = await launch();
  const encoded = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(8, 8);
    canvas.getContext('2d')!.fillRect(0, 0, 8, 8);
    const blob = await canvas.convertToBlob({ type: 'image/webp' });
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  writeFileSync(webp, Buffer.from(encoded));
  await stubFolderPicker(app, [parent, ase, webp]);
  await home(page);
  await page.getByRole('searchbox').fill('campfire');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Open in Studio' }).click();
  await page.getByRole('tab', { name: 'Sprites' }).click();
  await page.getByRole('button', { name: 'Import sprite' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('hero.aseprite')).toBeVisible();
  await page.getByRole('button', { name: 'Import sprite' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('hero.webp')).toBeVisible();
  await app.close();
});

test('new export formats write Aseprite, WebP, BMP, TGA, and JPEG', async () => {
  test.setTimeout(90_000);
  const out = mkdtempSync(join(tmpdir(), 'f-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await home(page);
  await page.getByRole('searchbox').fill('pickups/coin-spin');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'Export now' }).click();
  for (const [format, name] of [
    [/^Aseprite/, 'a'],
    [/^Animated WebP/, 'w'],
    [/^BMP sequence/, 'b'],
    [/^TGA sequence/, 't'],
    [/^JPEG sequence/, 'j'],
  ] as const) {
    await page.getByRole('button', { name: format }).click();
    await page.getByLabel('File name').fill(name);
    await page.getByRole('button', { name: 'Choose a folder and export' }).click();
    await expect(page.getByRole('status')).toContainText('Exported', { timeout: 30_000 });
    await page.getByLabel('File name').fill(`${name}2`);
  }
  expect(readdirSync(out).sort()).toEqual(['a.aseprite', 'b', 'j', 't', 'w.webp']);
  expect(readdirSync(join(out, 'j', 'S'))[0]).toBe('0001.jpg');
  await app.close();
});

test('a reopened project exports its sprite without visiting the Sprites tab', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'r-'));
  const out = mkdtempSync(join(tmpdir(), 'ro-'));
  const dir = mkdtempSync(join(tmpdir(), 'rs-'));
  const sprite = join(dir, 'hero.png');
  const png = new PNG({ width: 16, height: 16 });
  for (let i = 0; i < 16 * 16; i++) png.data.set([255, 0, 200, 255], i * 4);
  writeFileSync(sprite, PNG.sync.write(png));

  const first = await launch();
  await stubFolderPicker(first.app, [parent, sprite]);
  await home(first.page);
  await first.page.getByRole('button', { name: 'New', exact: true }).click();
  await first.page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(first.page.getByRole('status').first()).toHaveText('Saved');
  await first.page.getByRole('tab', { name: 'Sprites' }).click();
  await first.page.getByRole('button', { name: 'Import sprite' }).click();
  await first.page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await first.page.getByRole('button', { name: 'Attach to effect' }).click();
  await first.page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(first.page.getByRole('status').first()).toHaveText('Saved');
  await first.app.close();

  const second = await launch(first.profile);
  await stubFolderPicker(second.app, [out]);
  await second.page.locator('canvas').first().click();
  await second.page.locator('.home').waitFor();
  await second.page.locator('.recent .link').first().click();
  await second.page.getByRole('button', { name: 'Export', exact: true }).click();
  await second.page.getByRole('button', { name: /^PNG sequence/ }).click();
  await second.page.getByLabel('File name').fill('reopen');
  await second.page.getByRole('button', { name: 'Choose a folder and export' }).click();
  await expect(second.page.getByRole('status').last()).toContainText('Exported');
  const direction = readdirSync(join(out, 'reopen'))[0]!;
  const file = readdirSync(join(out, 'reopen', direction))[0]!;
  const image = PNG.sync.read(readFileSync(join(out, 'reopen', direction, file)));
  expect([...image.data].some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  await second.app.close();
});

test('canvas and timeline size change from the Studio', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('W', { exact: true }).fill('256');
  await page.getByLabel('Frames', { exact: true }).fill('48');
  await page.getByLabel('FPS', { exact: true }).fill('24');
  await page.getByLabel('FPS', { exact: true }).press('Enter');
  await expect(page.getByLabel('W', { exact: true })).toHaveValue('256');
  await expect(page.getByText('/ 2.00')).toBeVisible();
  await app.close();
});

test('leaving an unsaved project asks first', async () => {
  const { app, page } = await launch();
  await home(page);
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('FPS', { exact: true }).fill('24');
  await page.getByLabel('FPS', { exact: true }).press('Enter');
  page.once('dialog', (d) => void d.dismiss());
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(page.locator('.studio')).toBeVisible();
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(page.locator('.home')).toBeVisible();
  await app.close();
});
