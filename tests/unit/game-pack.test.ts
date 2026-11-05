import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildGamePack } from '../../src/engine/exporters/game-pack';
import { GamePackManifestSchema } from '../../src/shared/schemas/game-pack-manifest';

const png = new Uint8Array([137, 80, 78, 71]);
const input = () => ({
  name: 'ฟื้นพลัง',
  metadata: { frames: [], meta: { app: 'VFX NexgerLab' } },
  entries: [
    { path: 'whole/S.png', kind: 'whole' as const, bytes: png },
    { path: 'behind-sprite/S.png', kind: 'behind' as const, bytes: png },
    { path: 'in-front-sprite/S.png', kind: 'front' as const, bytes: png },
    { path: 'parts/abc/S.png', kind: 'part' as const, bytes: png, part: 'abc' },
    { path: 'directions/S/whole.png', kind: 'direction' as const, bytes: png, direction: 'S' },
    { path: 'normals/whole/S.png', kind: 'normal' as const, bytes: png },
  ],
});

describe('buildGamePack', () => {
  it('holds every file and a manifest that lists them all', () => {
    const files = unzipSync(buildGamePack(input()));
    const manifest = GamePackManifestSchema.parse(JSON.parse(strFromU8(files['manifest.json']!)));
    expect(manifest.files.map((f) => f.path).sort()).toEqual(
      Object.keys(files)
        .filter((p) => p !== 'manifest.json')
        .filter((p) => p !== 'metadata.json')
        .sort(),
    );
    for (const f of manifest.files) expect(files[f.path], f.path).toBeTruthy();
    expect(manifest.name).toBe('ฟื้นพลัง');
    expect(JSON.parse(strFromU8(files['metadata.json']!)).meta.app).toBe('VFX NexgerLab');
  });

  it.each(['../evil.png', '/abs.png', 'a/../../b.png', 'a\\b.png'])(
    'refuses the path %s',
    (path) => {
      const bad = input();
      bad.entries[0]!.path = path;
      expect(() => buildGamePack(bad)).toThrow();
    },
  );

  it('refuses duplicates', () => {
    const bad = input();
    bad.entries[1]!.path = bad.entries[0]!.path;
    expect(() => buildGamePack(bad)).toThrow(/Duplicate/);
  });

  it('refuses a pack over the size limit', () => {
    const big = input();
    big.entries[0]!.bytes = new Uint8Array(1025 * 1024 * 1024);
    expect(() => buildGamePack(big)).toThrow(/too large/i);
  });
});
