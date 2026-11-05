import { describe, expect, it } from 'vitest';
import { hashPixels } from '../../src/engine/frame-hash';
import { encodeGlb, encodeObj, buildVoxelMesh } from '../../src/engine/maps/mesh';
import { MAP_KINDS, TILES, createMap, renderMap, setTile } from '../../src/engine/maps/map';
import { renderWangTileset, tilesetFrame, toTiledJson } from '../../src/engine/maps/tiles';

const base = { kind: 'topdown', width: 16, height: 12, seed: 5, biome: 'temperate' } as const;

describe('createMap', () => {
  it('is deterministic and changes with the seed', () => {
    expect(createMap(base).tiles).toEqual(createMap(base).tiles);
    expect(createMap({ ...base, seed: 6 }).tiles).not.toEqual(createMap(base).tiles);
  });

  it.each(['temperate', 'desert', 'snow', 'island'] as const)(
    '%s uses more than one tile',
    (biome) => {
      const map = createMap({ ...base, width: 64, height: 64, biome });
      expect(new Set(map.tiles).size).toBeGreaterThan(1);
      expect(map.tiles.every((t) => t < TILES.length)).toBe(true);
    },
  );

  it.each([
    [{ width: 4 }],
    [{ width: 513 }],
    [{ height: 0 }],
    [{ width: Number.NaN }],
    [{ seed: Number.POSITIVE_INFINITY }],
  ])('rejects %j', (bad) => {
    expect(() => createMap({ ...base, ...bad })).toThrow(RangeError);
  });

  it('builds a side view with ground under the surface and air above', () => {
    const map = createMap({ ...base, kind: 'sidescroller', width: 40, height: 20 });
    const column = Array.from({ length: 20 }, (_, y) => map.tiles[y * 40]!);
    expect(column[0]).toBe(TILES.indexOf('air'));
    expect(column[19]).not.toBe(TILES.indexOf('air'));
  });
});

describe('renderMap', () => {
  it.each(MAP_KINDS)('%s renders pixels', (kind) => {
    const frame = renderMap(createMap({ ...base, kind }));
    expect(frame.pixels.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
    expect(hashPixels(frame.pixels)).toBe(
      hashPixels(renderMap(createMap({ ...base, kind })).pixels),
    );
  });

  it('draws top-down maps at 16 px per tile', () => {
    expect(renderMap(createMap(base))).toMatchObject({ width: 160 + 96, height: 192 });
  });

  it('reflects a painted tile', () => {
    const map = createMap(base);
    const before = hashPixels(renderMap(map).pixels);
    const painted = setTile(map, 3, 3, TILES.indexOf('rock'));
    expect(hashPixels(renderMap(painted).pixels)).not.toBe(before);
    expect(map.tiles).not.toBe(painted.tiles);
  });

  it('ignores a paint outside the map', () => {
    const map = createMap(base);
    expect(setTile(map, 99, 0, 1)).toBe(map);
    expect(setTile(map, -1, 0, 1)).toBe(map);
    expect(setTile(map, 0, 0, 99)).toBe(map);
  });
});

describe('tilesets', () => {
  it('builds a 16-tile Wang set with distinct corners', () => {
    const f = renderWangTileset('grass', 'sand', 3);
    expect([f.width, f.height]).toEqual([64, 64]);
    const tile = (x: number, y: number) =>
      f.pixels.slice((y * 16 * 64 + x * 16) * 4, (y * 16 * 64 + x * 16 + 16) * 4).join();
    expect(tile(0, 0)).not.toBe(tile(3, 3));
  });

  it('writes a Tiled map that matches the tile grid', () => {
    const map = createMap(base);
    const tmj = toTiledJson(map, 'tileset.png');
    expect(tmj).toMatchObject({
      type: 'map',
      width: 16,
      height: 12,
      tilewidth: 16,
      orientation: 'orthogonal',
    });
    expect(tmj.layers[0]!.data).toHaveLength(192);
    expect(tmj.layers[0]!.data[0]).toBe(map.tiles[0]! + 1);
    expect(tmj.tilesets[0]).toMatchObject({ image: 'tileset.png', tilecount: TILES.length });
    expect(tilesetFrame(map.seed).width).toBe(TILES.length * 16);
  });

  it('marks isometric maps for Tiled', () => {
    expect(toTiledJson(createMap({ ...base, kind: 'isometric' }), 't.png').orientation).toBe(
      'isometric',
    );
  });
});

describe('3D export', () => {
  const mesh = buildVoxelMesh(createMap({ ...base, kind: 'voxel3d', width: 8, height: 8 }));

  it('makes a closed list of triangles with colors', () => {
    expect(mesh.positions.length % 3).toBe(0);
    expect(mesh.colors.length).toBe(mesh.positions.length);
    expect(mesh.normals.length).toBe(mesh.positions.length);
    expect(mesh.indices.length % 3).toBe(0);
    expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3);
  });

  it('writes a valid GLB', () => {
    const glb = encodeGlb(mesh);
    const v = new DataView(glb.buffer, glb.byteOffset);
    expect(new TextDecoder().decode(glb.slice(0, 4))).toBe('glTF');
    expect(v.getUint32(4, true)).toBe(2);
    expect(v.getUint32(8, true)).toBe(glb.length);
    const jsonLength = v.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(glb.slice(20, 20 + jsonLength)));
    expect(json.asset.version).toBe('2.0');
    const position = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
    expect(position.count).toBe(mesh.positions.length / 3);
    expect(position.min).toHaveLength(3);
    expect((jsonLength + 20) % 4).toBe(0);
    expect(v.getUint32(20 + jsonLength, true) + jsonLength + 28).toBe(glb.length);
  });

  it('writes an OBJ with vertex and face lines', () => {
    const obj = encodeObj(mesh);
    expect(obj.match(/^v /gm)).toHaveLength(mesh.positions.length / 3);
    expect(obj.match(/^f /gm)).toHaveLength(mesh.indices.length / 3);
  });
});
