import type { FrameRGBA } from '../render-types';
import { fbm } from './noise';
import { drawTile, TILE } from './tiles';

export const TILES = ['air', 'water', 'sand', 'grass', 'forest', 'dirt', 'rock', 'snow'] as const;
export type TileName = (typeof TILES)[number];

export const MAP_KINDS = ['topdown', 'sidescroller', 'isometric', 'voxel3d'] as const;
export type MapKind = (typeof MAP_KINDS)[number];
export const BIOMES = ['temperate', 'desert', 'snow', 'island'] as const;
export type Biome = (typeof BIOMES)[number];

export interface MapInput {
  kind: MapKind;
  width: number;
  height: number;
  seed: number;
  biome: Biome;
}

export interface GameMap extends MapInput {
  tiles: Uint8Array;
  heights: Uint8Array;
}

const MIN_SIDE = 8;
const MAX_SIDE = 512;
const MAX_HEIGHT = 24;
const ISO_W = 16;
const ISO_H = 8;
const ISO_STEP = 4;

const id = (name: TileName) => TILES.indexOf(name);

const BANDS: Record<Biome, Array<[number, TileName]>> = {
  temperate: [
    [0.3, 'water'],
    [0.36, 'sand'],
    [0.6, 'grass'],
    [0.75, 'forest'],
    [0.88, 'rock'],
    [1.01, 'snow'],
  ],
  desert: [
    [0.12, 'water'],
    [0.7, 'sand'],
    [0.88, 'dirt'],
    [1.01, 'rock'],
  ],
  snow: [
    [0.25, 'water'],
    [0.7, 'snow'],
    [0.82, 'forest'],
    [1.01, 'rock'],
  ],
  island: [
    [0.42, 'water'],
    [0.5, 'sand'],
    [0.72, 'grass'],
    [0.88, 'forest'],
    [1.01, 'rock'],
  ],
};

function assertInput({ width, height, seed }: MapInput): void {
  const side = (v: number) => Number.isInteger(v) && v >= MIN_SIDE && v <= MAX_SIDE;
  if (!side(width) || !side(height) || !Number.isFinite(seed))
    throw new RangeError('Map size or seed out of range');
}

function surface(input: MapInput): Float32Array {
  const { width: w, height: h, seed, biome } = input;
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = fbm(x / 18, y / 18, seed);
      if (biome === 'island') {
        const dx = (x + 0.5) / w - 0.5;
        const dy = (y + 0.5) / h - 0.5;
        v *= 1.5 - Math.hypot(dx, dy) * 2.1;
      }
      out[y * w + x] = Math.min(1, Math.max(0, v));
    }
  }
  return out;
}

function sideMap(input: MapInput): GameMap {
  const { width: w, height: h, seed } = input;
  const tiles = new Uint8Array(w * h);
  const heights = new Uint8Array(w);
  for (let x = 0; x < w; x++) {
    const top = Math.round(h * (0.45 + fbm(x / 12, 3.5, seed) * 0.35));
    heights[x] = h - top;
    for (let y = top; y < h; y++)
      tiles[y * w + x] = id(y === top ? 'grass' : y < top + 3 ? 'dirt' : 'rock');
  }
  return { ...input, tiles, heights };
}

export function createMap(input: MapInput): GameMap {
  assertInput(input);
  if (input.kind === 'sidescroller') return sideMap(input);
  const field = surface(input);
  const bands = BANDS[input.biome];
  const tiles = new Uint8Array(field.length);
  const heights = new Uint8Array(field.length);
  field.forEach((v, i) => {
    tiles[i] = id(bands.find(([limit]) => v < limit)![1]);
    heights[i] = Math.round(Math.max(v, 0.3) * MAX_HEIGHT);
  });
  return { ...input, tiles, heights };
}

/** A new map with one tile changed. Paints outside the grid or with an unknown tile do nothing. */
export function setTile(map: GameMap, x: number, y: number, tile: number): GameMap {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height || !TILES[tile]) return map;
  const tiles = map.tiles.slice();
  tiles[y * map.width + x] = tile;
  return { ...map, tiles };
}

function blit(out: FrameRGBA, tile: Uint8ClampedArray, dx: number, dy: number): void {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const from = (y * TILE + x) * 4;
      if (tile[from + 3] === 0) continue;
      out.pixels.set(tile.subarray(from, from + 4), ((dy + y) * out.width + dx + x) * 4);
    }
  }
}

function renderFlat(map: GameMap): FrameRGBA {
  const out = {
    width: map.width * TILE,
    height: map.height * TILE,
    pixels: new Uint8ClampedArray(map.width * map.height * TILE * TILE * 4),
  };
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const name = TILES[map.tiles[y * map.width + x]!]!;
      if (name !== 'air')
        blit(out, drawTile(name, (x * 7 + y * 13) % 4, map.seed), x * TILE, y * TILE);
    }
  }
  return out;
}

const COLOR: Record<TileName, [number, number, number]> = {
  air: [0, 0, 0],
  water: [46, 110, 190],
  sand: [214, 190, 128],
  grass: [92, 158, 70],
  forest: [48, 110, 62],
  dirt: [122, 86, 56],
  rock: [120, 122, 134],
  snow: [226, 234, 242],
};

export const tileColor = (tile: number): [number, number, number] => COLOR[TILES[tile] ?? 'rock'];

function renderIso(map: GameMap): FrameRGBA {
  const { width: w, height: h } = map;
  const halfW = ISO_W / 2;
  const halfH = ISO_H / 2;
  const levels = (i: number) =>
    map.tiles[i] === id('water') ? 2 : Math.floor(map.heights[i]! / 3);
  const lift = Math.ceil(MAX_HEIGHT / 3) * ISO_STEP;
  const width = (w + h) * halfW;
  const height = (w + h) * halfH + lift + ISO_H;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const dot = (x: number, y: number, c: number[]) => {
    if (x >= 0 && y >= 0 && x < width && y < height) pixels.set(c, (y * width + x) * 4);
  };
  for (let sum = 0; sum < w + h - 1; sum++) {
    for (let y = Math.max(0, sum - w + 1); y <= Math.min(sum, h - 1); y++) {
      const x = sum - y;
      const i = y * w + x;
      const [r, g, b] = tileColor(map.tiles[i]!);
      const cx = (x - y) * halfW + h * halfW;
      const top = (x + y) * halfH + lift - levels(i) * ISO_STEP;
      const base = (x + y) * halfH + lift;
      for (let dy = 0; dy < ISO_H; dy++) {
        const span = dy < halfH ? dy * 2 + 2 : (ISO_H - dy) * 2;
        for (let dx = -span; dx < span; dx++) dot(cx + dx, top + dy, [r, g, b, 255]);
      }
      for (let dx = -halfW; dx < halfW; dx++) {
        const edge = dx < 0 ? halfH + Math.floor((dx + halfW) / 2) : ISO_H - 1 - Math.floor(dx / 2);
        const k = dx < 0 ? 0.72 : 0.56;
        for (let py = top + edge; py < base + edge + 1; py++)
          dot(cx + dx, py, [r * k, g * k, b * k, 255]);
      }
    }
  }
  return { width, height, pixels };
}

export function renderMap(map: GameMap): FrameRGBA {
  return map.kind === 'isometric' || map.kind === 'voxel3d' ? renderIso(map) : renderFlat(map);
}
