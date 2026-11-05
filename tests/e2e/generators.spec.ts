import { expect, test } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  await page.getByRole('button', { name: 'Water' }).click();
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
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=red:s=8x8',
    '-frames:v',
    '1',
    webp,
  ]);
  const { app, page } = await launch();
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
