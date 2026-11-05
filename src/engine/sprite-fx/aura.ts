import type { AssetFrame } from '../../shared/models/asset';
import type { SpriteFx } from '../../shared/schemas/project';
import { distanceField, parseHex, type SpriteFxLayer } from './layer';

const REACH = 2;
const PULSE_FRAMES = 24;

/** A pulsing outline just outside the silhouette of this exact frame. */
export function aura(fx: SpriteFx, sprite: AssetFrame, frameIndex: number): SpriteFxLayer {
  const { field, width, height } = distanceField(sprite, REACH);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = parseHex(fx.color);
  const pulse = 0.7 + 0.3 * Math.sin((frameIndex / PULSE_FRAMES) * Math.PI * 2);
  for (let i = 0; i < field.length; i++) {
    const d = field[i]!;
    if (d === 0 || d > REACH) continue;
    rgba.set([r, g, b, 255 * fx.strength * pulse * (1 - (d - 1) / (REACH + 1))], i * 4);
  }
  return { rgba, width, height, dx: -REACH, dy: -REACH, blend: 'normal' };
}
