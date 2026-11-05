import type { FrameRGBA } from '../render-types';

const HEADER = 18;
const TRUE_COLOR = 2;
const TOP_LEFT_8BIT_ALPHA = 0x28;

export function encodeTga({ width, height, pixels }: FrameRGBA): Uint8Array {
  const out = new Uint8Array(HEADER + pixels.length);
  const v = new DataView(out.buffer);
  out[2] = TRUE_COLOR;
  v.setUint16(12, width, true);
  v.setUint16(14, height, true);
  out[16] = 32;
  out[17] = TOP_LEFT_8BIT_ALPHA;
  for (let i = 0; i < pixels.length; i += 4) {
    out[HEADER + i] = pixels[i + 2]!;
    out[HEADER + i + 1] = pixels[i + 1]!;
    out[HEADER + i + 2] = pixels[i]!;
    out[HEADER + i + 3] = pixels[i + 3]!;
  }
  return out;
}
