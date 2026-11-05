import type { FrameRGBA } from '../render-types';
import { TILES, type GameMap, type TileName } from './map';
import { speck } from './noise';

export const TILE = 16;

const SHADES: Record<TileName, number[][]> = {
  air: [[0, 0, 0]],
  water: [
    [38, 96, 176],
    [46, 110, 190],
    [70, 138, 208],
    [120, 186, 232],
  ],
  sand: [
    [196, 170, 110],
    [214, 190, 128],
    [226, 206, 150],
    [176, 150, 96],
  ],
  grass: [
    [76, 138, 58],
    [92, 158, 70],
    [112, 176, 84],
    [60, 116, 50],
  ],
  forest: [
    [36, 88, 50],
    [48, 110, 62],
    [62, 128, 74],
    [28, 70, 42],
  ],
  dirt: [
    [104, 72, 46],
    [122, 86, 56],
    [140, 102, 68],
    [88, 60, 38],
  ],
  rock: [
    [100, 102, 114],
    [120, 122, 134],
    [142, 144, 156],
    [82, 84, 96],
  ],
  snow: [
    [210, 222, 234],
    [226, 234, 242],
    [240, 246, 250],
    [188, 204, 222],
  ],
};
const CACHE = new Map<string, Uint8ClampedArray>();

/** A seamless-looking 16 px tile: speckled shades chosen per pixel from the seed. */
export function drawTile(name: TileName, variant: number, seed: number): Uint8ClampedArray {
  const key = `${name}:${variant}:${seed}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const out = new Uint8ClampedArray(TILE * TILE * 4);
  const shades = SHADES[name];
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (name === 'air') continue;
      const r = speck(x + variant * 31, y, seed + TILES.indexOf(name) * 101);
      const wave = name === 'water' && (y + variant * 3) % 6 === 0 && (x + y) % 5 < 3;
      const shade = wave
        ? shades[3]!
        : r < 0.55
          ? shades[1]!
          : r < 0.8
            ? shades[0]!
            : r < 0.94
              ? shades[2]!
              : shades[3]!;
      out.set([...shade, 255], (y * TILE + x) * 4);
    }
  }
  if (CACHE.size > 512) CACHE.clear();
  CACHE.set(key, out);
  return out;
}

/** One row with a tile for each terrain, in the same order as TILES, for Tiled and engines. */
export function tilesetFrame(seed: number): FrameRGBA {
  const width = TILES.length * TILE;
  const pixels = new Uint8ClampedArray(width * TILE * 4);
  TILES.forEach((name, i) => {
    const tile = drawTile(name, 0, seed);
    for (let y = 0; y < TILE; y++) {
      pixels.set(tile.subarray(y * TILE * 4, (y + 1) * TILE * 4), (y * width + i * TILE) * 4);
    }
  });
  return { width, height: TILE, pixels };
}

/**
 * The 16 corner combinations of two terrains, four across. Each tile index is its corner bits:
 * 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right. A set bit shows `upper`.
 */
export function renderWangTileset(lower: TileName, upper: TileName, seed: number): FrameRGBA {
  const size = TILE * 4;
  const pixels = new Uint8ClampedArray(size * size * 4);
  const a = drawTile(lower, 0, seed);
  const b = drawTile(upper, 1, seed);
  for (let index = 0; index < 16; index++) {
    const ox = (index % 4) * TILE;
    const oy = Math.floor(index / 4) * TILE;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const bit = (y < TILE / 2 ? 0 : 2) + (x < TILE / 2 ? 0 : 1);
        const edge = speck(x, y, seed) * 2 > Math.abs(x - 7.5) + Math.abs(y - 7.5) - 6;
        const up =
          (index >> bit) & 1 || (edge && index > 0 && index < 15 && speck(x, y, seed + 9) > 0.7);
        const from = (y * TILE + x) * 4;
        pixels.set((up ? b : a).subarray(from, from + 4), ((oy + y) * size + ox + x) * 4);
      }
    }
  }
  return { width: size, height: size, pixels };
}

export function toTiledJson(map: GameMap, image: string) {
  const iso = map.kind === 'isometric' || map.kind === 'voxel3d';
  return {
    type: 'map',
    version: '1.10',
    orientation: iso ? 'isometric' : 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: map.width,
    height: map.height,
    tilewidth: TILE,
    tileheight: iso ? TILE / 2 : TILE,
    nextlayerid: 2,
    nextobjectid: 1,
    layers: [
      {
        id: 1,
        name: 'terrain',
        type: 'tilelayer',
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
        width: map.width,
        height: map.height,
        data: Array.from(map.tiles, (t) => t + 1),
      },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: 'terrain',
        image,
        imagewidth: TILES.length * TILE,
        imageheight: TILE,
        tilewidth: TILE,
        tileheight: TILE,
        tilecount: TILES.length,
        columns: TILES.length,
        margin: 0,
        spacing: 0,
      },
    ],
  };
}
