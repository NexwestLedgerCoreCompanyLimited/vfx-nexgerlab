import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AssetError,
  importAsset,
  readAssetFrames,
  removeAsset,
} from '../../src/main/services/asset-service';
import { nodeFileSystem } from '../../src/main/services/file-system-adapter';
import { createProjectService } from '../../src/main/services/project-service';
import type { ProjectHandle } from '../../src/shared/contracts/ipc';
import { gifBytes, pngBytes } from '../helpers/images';

const tmp = () => mkdtempSync(join(tmpdir(), 'asset-'));
async function project(): Promise<ProjectHandle> {
  const svc = createProjectService({ fs: nodeFileSystem, recentFile: join(tmp(), 'r.json') });
  return svc.createProject({ parentDir: tmp(), name: 'p' });
}
function source(name: string, bytes: Buffer): string {
  const path = join(tmp(), name);
  writeFileSync(path, bytes);
  return path;
}
const red = () => [255, 0, 0, 255];
const code = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: AssetError) => e.code,
  );

describe('importAsset', () => {
  it('imports a PNG, keeps the Thai name, and stores by hash', async () => {
    const h = await project();
    const ref = await importAsset(h, { sourcePath: source('ฮีโร่ hero.png', pngBytes(4, 6, red)) });
    expect(ref).toMatchObject({
      originalName: 'ฮีโร่ hero.png',
      kind: 'png',
      width: 4,
      height: 6,
      frameCount: 1,
    });
    expect(ref.path).toBe(`assets/${ref.hash}.png`);
    expect(existsSync(join(h.path, ref.path))).toBe(true);
    const [frame] = await readAssetFrames(h.path, ref);
    expect(Array.from(frame!.rgba.slice(0, 4))).toEqual([255, 0, 0, 255]);
  });

  it('decodes every GIF frame with its timing', async () => {
    const h = await project();
    const ref = await importAsset(h, {
      sourcePath: source(
        'a.gif',
        gifBytes(
          3,
          3,
          [
            [255, 0, 0, 255],
            [0, 255, 0, 255],
            [0, 0, 255, 255],
          ],
          120,
        ),
      ),
    });
    expect(ref).toMatchObject({ kind: 'gif', frameCount: 3, width: 3 });
    const frames = await readAssetFrames(h.path, ref);
    expect(frames).toHaveLength(3);
    expect(frames[1]!.durationMs).toBe(120);
    expect(frames[1]!.rgba[1]).toBeGreaterThan(200);
  });

  it('slices a horizontal strip with explicit frames and FPS', async () => {
    const h = await project();
    const bytes = pngBytes(12, 2, (x) => (x < 6 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
    const ref = await importAsset(h, {
      sourcePath: source('s.png', bytes),
      strip: { frameCount: 2, fps: 10 },
    });
    expect(ref).toMatchObject({
      kind: 'sprite-strip',
      width: 6,
      height: 2,
      frameCount: 2,
      fps: 10,
    });
    const frames = await readAssetFrames(h.path, ref);
    expect(frames[1]!.rgba[2]).toBe(255);
    expect(frames[1]!.durationMs).toBe(100);
  });

  it('rejects a strip that does not divide evenly', async () => {
    const h = await project();
    const path = source('s.png', pngBytes(7, 2, red));
    expect(
      await code(importAsset(h, { sourcePath: path, strip: { frameCount: 2, fps: 10 } })),
    ).toBe('bad-strip');
    expect(
      await code(importAsset(h, { sourcePath: path, strip: { frameCount: 0, fps: 10 } })),
    ).toBe('bad-strip');
  });

  it('reuses one file for duplicate content', async () => {
    const h = await project();
    const bytes = pngBytes(2, 2, red);
    const a = await importAsset(h, { sourcePath: source('a.png', bytes) });
    const b = await importAsset(h, { sourcePath: source('b.png', bytes) });
    expect(b.hash).toBe(a.hash);
    expect(readdirSync(join(h.path, 'assets'))).toHaveLength(1);
  });

  it('judges a file by its content, not its extension', async () => {
    const h = await project();
    const ref = await importAsset(h, { sourcePath: source('lie.gif', pngBytes(2, 2, red)) });
    expect(ref.kind).toBe('png');
    expect(
      await code(importAsset(h, { sourcePath: source('x.png', Buffer.from('<svg></svg>')) })),
    ).toBe('unsupported');
  });

  it('rejects truncated files', async () => {
    const h = await project();
    const png = pngBytes(8, 8, red);
    expect(await code(importAsset(h, { sourcePath: source('t.png', png.subarray(0, 30)) }))).toBe(
      'corrupt',
    );
    const gif = gifBytes(8, 8, [[1, 2, 3, 255]]);
    expect(await code(importAsset(h, { sourcePath: source('t.gif', gif.subarray(0, 12)) }))).toBe(
      'corrupt',
    );
  });

  it('rejects oversized input before decoding', async () => {
    const h = await project();
    const big = Buffer.alloc(25 * 1024 * 1024 + 1);
    expect(await code(importAsset(h, { sourcePath: source('b.png', big) }))).toBe('too-large');
  });

  it('rejects sources over 4096 px', async () => {
    const h = await project();
    expect(
      await code(importAsset(h, { sourcePath: source('w.png', pngBytes(4097, 1, red)) })),
    ).toBe('too-large');
    const header = gifBytes(2, 2, [[1, 2, 3, 255]]);
    header.writeUInt16LE(5000, 6);
    expect(await code(importAsset(h, { sourcePath: source('w.gif', header) }))).toBe('too-large');
  });

  it('reports a missing source', async () => {
    const h = await project();
    expect(await code(importAsset(h, { sourcePath: join(tmp(), 'gone.png') }))).toBe('missing');
  });

  it('refuses to read a file whose content changed', async () => {
    const h = await project();
    const ref = await importAsset(h, { sourcePath: source('a.png', pngBytes(2, 2, red)) });
    writeFileSync(
      join(h.path, ref.path),
      pngBytes(2, 2, () => [0, 0, 0, 255]),
    );
    expect(await code(readAssetFrames(h.path, ref))).toBe('corrupt');
  });
});

describe('removeAsset', () => {
  it('refuses while referenced and deletes afterward', async () => {
    const h = await project();
    const ref = await importAsset(h, { sourcePath: source('a.png', pngBytes(2, 2, red)) });
    const attachment = {
      id: crypto.randomUUID(),
      assetId: ref.id,
      outputToSourceFrames: [0],
      frameAnchors: [],
      behindPartIds: [],
      inFrontPartIds: [],
    };
    const inUse = { ...h.project, assets: [ref], spriteAttachments: [attachment] };
    expect(await code(removeAsset(h.path, inUse, ref.id))).toBe('in-use');
    const inHistory = {
      ...inUse,
      spriteAttachments: [],
      versions: [{ ...inUse.versions[0]!, spriteAttachments: [attachment] }],
    };
    expect(await code(removeAsset(h.path, inHistory, ref.id))).toBe('in-use');
    const free = { ...h.project, assets: [ref] };
    await removeAsset(h.path, free, ref.id);
    expect(existsSync(join(h.path, ref.path))).toBe(false);
    expect(readFileSync(join(h.path, 'project.vfxlab.json'), 'utf8')).toContain('"assets"');
  });
});
