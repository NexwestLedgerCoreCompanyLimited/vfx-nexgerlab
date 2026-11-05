import type { AssetFrame } from '../../shared/models/asset';
import type { SpriteFx } from '../../shared/schemas/project';
import { parseHex, type SpriteFxLayer } from './layer';

/** Colored light falling from the top of the sprite, brightest on the top rows. */
export function light(fx: SpriteFx, sprite: AssetFrame): SpriteFxLayer {
  const { width, height } = sprite;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = parseHex(fx.color);
  for (let y = 0; y < height; y++) {
    const fall = 1 - y / height;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = sprite.rgba[i + 3]!;
      if (a === 0 || fx.strength === 0) continue;
      const k = fx.strength * fall;
      rgba[i] = sprite.rgba[i]! + (r - sprite.rgba[i]!) * k * 0.6;
      rgba[i + 1] = sprite.rgba[i + 1]! + (g - sprite.rgba[i + 1]!) * k * 0.6;
      rgba[i + 2] = sprite.rgba[i + 2]! + (b - sprite.rgba[i + 2]!) * k * 0.6;
      rgba[i + 3] = a;
    }
  }
  return { rgba, width, height, dx: 0, dy: 0, blend: 'normal' };
}
