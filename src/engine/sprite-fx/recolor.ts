import type { AssetFrame } from '../../shared/models/asset';
import type { SpriteFx } from '../../shared/schemas/project';
import { parseHex, type SpriteFxLayer } from './layer';

/** Tints each pixel toward the color at its own brightness, so shading survives. */
export function recolor(fx: SpriteFx, sprite: AssetFrame): SpriteFxLayer {
  const { width, height } = sprite;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = parseHex(fx.color);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = sprite.rgba[i + 3]!;
    if (a === 0 || fx.strength === 0) continue;
    const lum =
      (0.3 * sprite.rgba[i]! + 0.59 * sprite.rgba[i + 1]! + 0.11 * sprite.rgba[i + 2]!) / 255;
    rgba[i] = sprite.rgba[i]! + (r * lum - sprite.rgba[i]!) * fx.strength;
    rgba[i + 1] = sprite.rgba[i + 1]! + (g * lum - sprite.rgba[i + 1]!) * fx.strength;
    rgba[i + 2] = sprite.rgba[i + 2]! + (b * lum - sprite.rgba[i + 2]!) * fx.strength;
    rgba[i + 3] = a;
  }
  return { rgba, width, height, dx: 0, dy: 0, blend: 'normal' };
}
