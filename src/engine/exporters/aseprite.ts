import { zlibSync } from 'fflate';
import { ASE_MAGIC, CEL_CHUNK, FRAME_MAGIC, LAYER_CHUNK } from '../importers/aseprite';
import type { FrameRGBA } from '../render-types';

const HEADER = 128;
const FRAME_HEADER = 16;
const COMPRESSED_IMAGE = 2;
const RGBA_DEPTH = 32;

function layerChunk(): Uint8Array {
  const name = new TextEncoder().encode('Layer 1');
  const out = new Uint8Array(6 + 18 + name.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, out.length, true);
  v.setUint16(4, LAYER_CHUNK, true);
  v.setUint16(6, 1, true); // visible
  out[18] = 255; // opacity
  v.setUint16(22, name.length, true);
  out.set(name, 24);
  return out;
}

function celChunk(frame: FrameRGBA): Uint8Array {
  const data = zlibSync(
    new Uint8Array(frame.pixels.buffer, frame.pixels.byteOffset, frame.pixels.byteLength),
  );
  const out = new Uint8Array(6 + 16 + 4 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, out.length, true);
  v.setUint16(4, CEL_CHUNK, true);
  out[12] = 255; // opacity
  v.setUint16(13, COMPRESSED_IMAGE, true);
  v.setUint16(22, frame.width, true);
  v.setUint16(24, frame.height, true);
  out.set(data, 26);
  return out;
}

/** One layer and one RGBA cel per frame, so the file opens as editable frames in Aseprite. */
export function encodeAseprite(frames: FrameRGBA[], durationsMs: number[]): Uint8Array {
  if (frames.length === 0) throw new Error('No frames to encode');
  const first = frames[0]!;
  const blocks = frames.map((frame, i) => {
    const chunks = i === 0 ? [layerChunk(), celChunk(frame)] : [celChunk(frame)];
    const size = FRAME_HEADER + chunks.reduce((n, c) => n + c.length, 0);
    const block = new Uint8Array(size);
    const v = new DataView(block.buffer);
    v.setUint32(0, size, true);
    v.setUint16(4, FRAME_MAGIC, true);
    v.setUint16(6, chunks.length, true);
    v.setUint16(8, durationsMs[i]!, true);
    v.setUint32(12, chunks.length, true);
    let at = FRAME_HEADER;
    for (const c of chunks) {
      block.set(c, at);
      at += c.length;
    }
    return block;
  });
  const total = HEADER + blocks.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint32(0, total, true);
  v.setUint16(4, ASE_MAGIC, true);
  v.setUint16(6, frames.length, true);
  v.setUint16(8, first.width, true);
  v.setUint16(10, first.height, true);
  v.setUint16(12, RGBA_DEPTH, true);
  v.setUint32(14, 1, true); // layer opacity is valid
  v.setUint16(18, durationsMs[0]!, true);
  out[34] = 1; // pixel width and height ratio
  out[35] = 1;
  let at = HEADER;
  for (const b of blocks) {
    out.set(b, at);
    at += b.length;
  }
  return out;
}
