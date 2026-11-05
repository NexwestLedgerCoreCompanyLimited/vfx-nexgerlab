import type { AssetFrame } from '../../shared/models/asset';
import type { SpriteFx } from '../../shared/schemas/project';
import { distanceField, parseHex, type SpriteFxLayer } from './layer';

const REACH = 6;

/** Soft light spreading from the silhouette, added over what is behind it. */
export function glow(fx: SpriteFx, sprite: AssetFrame): SpriteFxLayer {
  const { field, width, height } = distanceField(sprite, REACH);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = parseHex(fx.color);
  for (let i = 0; i < field.length; i++) {
    const d = field[i]!;
    if (d > REACH) continue;
    const fall = 1 - d / (REACH + 1);
    rgba.set([r, g, b, 200 * fx.strength * fall * fall], i * 4);
  }
  return { rgba, width, height, dx: -REACH, dy: -REACH, blend: 'add' };
}
