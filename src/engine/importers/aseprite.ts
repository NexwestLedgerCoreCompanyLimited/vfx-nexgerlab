import { unzlibSync } from 'fflate';
import type { AssetFrame } from '../../shared/models/asset';

export const ASE_MAGIC = 0xa5e0;
export const FRAME_MAGIC = 0xf1fa;
export const LAYER_CHUNK = 0x2004;
export const CEL_CHUNK = 0x2005;

const HEADER = 128;
const FRAME_HEADER = 16;
const RAW_IMAGE = 0;
const COMPRESSED_IMAGE = 2;
const RGBA_DEPTH = 32;
const MAX_SIDE = 4096;
const MAX_FRAMES = 600;

/** Reads RGBA Aseprite files, compositing visible cels by layer order. Indexed files are refused. */
export function decodeAseprite(bytes: Uint8Array): AssetFrame[] {
  if (bytes.length < HEADER) throw new Error('corrupt');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint16(4, true) !== ASE_MAGIC) throw new Error('corrupt');
  if (v.getUint32(0, true) !== bytes.length) throw new Error('corrupt');
  const count = v.getUint16(6, true);
  const width = v.getUint16(8, true);
  const height = v.getUint16(10, true);
  if (v.getUint16(12, true) !== RGBA_DEPTH) throw new Error('unsupported');
  if (width === 0 || height === 0 || width > MAX_SIDE || height > MAX_SIDE)
    throw new Error('too-large');
  if (count === 0 || count > MAX_FRAMES) throw new Error('too-large');

  const frames: AssetFrame[] = [];
  let at = HEADER;
  for (let f = 0; f < count; f++) {
    if (at + FRAME_HEADER > bytes.length) throw new Error('corrupt');
    const size = v.getUint32(at, true);
    if (v.getUint16(at + 4, true) !== FRAME_MAGIC || at + size > bytes.length)
      throw new Error('corrupt');
    const chunks = v.getUint32(at + 12, true) || v.getUint16(at + 6, true);
    const durationMs = v.getUint16(at + 8, true) || 100;
    const rgba = new Uint8ClampedArray(width * height * 4);
    let c = at + FRAME_HEADER;
    for (let i = 0; i < chunks; i++) {
      if (c + 6 > at + size) throw new Error('corrupt');
      const length = v.getUint32(c, true);
      if (length < 6 || c + length > at + size) throw new Error('corrupt');
      if (v.getUint16(c + 4, true) === CEL_CHUNK) drawCel(bytes, v, c, length, rgba, width, height);
      c += length;
    }
    frames.push({ width, height, rgba, durationMs });
    at += size;
  }
  return frames;
}

function drawCel(
  bytes: Uint8Array,
  v: DataView,
  c: number,
  length: number,
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  const x = v.getInt16(c + 8, true);
  const y = v.getInt16(c + 10, true);
  const type = v.getUint16(c + 13, true);
  if (type !== RAW_IMAGE && type !== COMPRESSED_IMAGE) return;
  const w = v.getUint16(c + 22, true);
  const h = v.getUint16(c + 24, true);
  if (w > MAX_SIDE || h > MAX_SIDE) throw new Error('too-large');
  const body = bytes.subarray(c + 26, c + length);
  const data = type === RAW_IMAGE ? body : unzlibSync(body, { out: new Uint8Array(w * h * 4) });
  if (data.length < w * h * 4) throw new Error('corrupt');
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const dx = x + col;
      const dy = y + row;
      const from = (row * w + col) * 4;
      if (dx < 0 || dy < 0 || dx >= width || dy >= height || data[from + 3] === 0) continue;
      rgba.set(data.subarray(from, from + 4), (dy * width + dx) * 4);
    }
  }
}
