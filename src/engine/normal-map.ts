import type { FrameRGBA } from './render-types';

export const MAX_NORMAL_STRENGTH = 10;

const luminance = (p: Uint8ClampedArray, i: number) =>
  (0.3 * p[i]! + 0.59 * p[i + 1]! + 0.11 * p[i + 2]!) / 255;

/**
 * A tangent-space normal map from canonical pixels, using luminance as height. OpenGL-style +Y up:
 * with y growing downward, the normal is normalize(-strength * dx, strength * dy, 1). Edges clamp.
 */
export function generateNormalMap(frame: FrameRGBA, { strength }: { strength: number }): FrameRGBA {
  if (!Number.isFinite(strength) || strength < 0 || strength > MAX_NORMAL_STRENGTH) {
    throw new RangeError(`Normal strength out of range: ${strength}`);
  }
  const { width: w, height: h, pixels } = frame;
  const out = new Uint8ClampedArray(pixels.length);
  const height = (x: number, y: number) =>
    luminance(pixels, (Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (-strength * (height(x + 1, y) - height(x - 1, y))) / 2;
      const ny = (strength * (height(x, y + 1) - height(x, y - 1))) / 2;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      out[i] = Math.round(((nx / len + 1) / 2) * 255);
      out[i + 1] = Math.round(((ny / len + 1) / 2) * 255);
      out[i + 2] = Math.round(((1 / len + 1) / 2) * 255);
      out[i + 3] = pixels[i + 3]!;
    }
  }
  return { width: w, height: h, pixels: out };
}
