import type { AssetFrame } from '../../shared/models/asset';
import type { EffectLayer } from '../../shared/schemas/project';

export interface SpriteFxLayer {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  /** Where this layer's top-left sits, relative to the sprite's top-left. */
  dx: number;
  dy: number;
  blend: EffectLayer['blend'];
}

export function parseHex(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** Distance in pixels to the nearest solid sprite pixel, up to reach, over a padded grid. */
export function distanceField(sprite: AssetFrame, reach: number) {
  const width = sprite.width + reach * 2;
  const height = sprite.height + reach * 2;
  const field = new Float32Array(width * height).fill(Infinity);
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (sprite.rgba[(y * sprite.width + x) * 4 + 3] === 0) continue;
      for (let j = -reach; j <= reach; j++) {
        for (let i = -reach; i <= reach; i++) {
          const at = (y + reach + j) * width + x + reach + i;
          field[at] = Math.min(field[at]!, Math.hypot(i, j));
        }
      }
    }
  }
  return { field, width, height };
}
