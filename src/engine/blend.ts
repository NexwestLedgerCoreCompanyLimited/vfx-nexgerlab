import type { EffectLayer } from '../shared/schemas/project';

type Blend = EffectLayer['blend'];

const MIX: Record<Blend, (b: number, s: number) => number> = {
  normal: (_b, s) => s,
  add: (b, s) => Math.min(1, b + s),
  screen: (b, s) => b + s - b * s,
  multiply: (b, s) => b * s,
};

/** Composites src over dst in place, using the W3C compositing formula. */
export function blendInto(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  mode: Blend,
  opacity: number,
): void {
  const mix = Object.hasOwn(MIX, mode) ? MIX[mode] : MIX.normal;
  for (let i = 0; i < dst.length; i += 4) {
    const as = (src[i + 3]! / 255) * opacity;
    if (as === 0) continue;
    const ab = dst[i + 3]! / 255;
    const ao = as + ab * (1 - as);
    for (let c = 0; c < 3; c++) {
      const cb = dst[i + c]! / 255;
      const cs = src[i + c]! / 255;
      const blended = (1 - ab) * cs + ab * mix(cb, cs);
      dst[i + c] = (((as * blended + (1 - as) * ab * cb) / ao) * 255 + 0.5) | 0;
    }
    dst[i + 3] = (ao * 255 + 0.5) | 0;
  }
}
