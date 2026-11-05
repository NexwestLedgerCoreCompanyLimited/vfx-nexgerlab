import type { FrameRGBA } from '../render-types';

const HEADER = 14 + 56;

/** 32-bit top-down BMP with an alpha mask (BITMAPV3INFOHEADER). */
export function encodeBmp({ width, height, pixels }: FrameRGBA): Uint8Array {
  const size = HEADER + pixels.length;
  const out = new Uint8Array(size);
  const v = new DataView(out.buffer);
  out[0] = 0x42;
  out[1] = 0x4d;
  v.setUint32(2, size, true);
  v.setUint32(10, HEADER, true);
  v.setUint32(14, 56, true);
  v.setInt32(18, width, true);
  v.setInt32(22, -height, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 32, true);
  v.setUint32(30, 3, true);
  v.setUint32(34, pixels.length, true);
  v.setUint32(54, 0x00ff0000, true);
  v.setUint32(58, 0x0000ff00, true);
  v.setUint32(62, 0x000000ff, true);
  v.setUint32(66, 0xff000000, true);
  for (let i = 0; i < pixels.length; i += 4) {
    out[HEADER + i] = pixels[i + 2]!;
    out[HEADER + i + 1] = pixels[i + 1]!;
    out[HEADER + i + 2] = pixels[i]!;
    out[HEADER + i + 3] = pixels[i + 3]!;
  }
  return out;
}
