import { zlibSync } from 'fflate';
import type { FrameRGBA } from '../render-types';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const RGBA_8BIT = 6;
const ZLIB_LEVEL = 6;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function words(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4);
  const view = new DataView(out.buffer);
  values.forEach((v, i) => view.setUint32(i * 4, v));
  return out;
}

function compressed({ width, height, pixels }: FrameRGBA): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return zlibSync(raw, { level: ZLIB_LEVEL });
}

const header = (width: number, height: number) => {
  const data = new Uint8Array(13);
  data.set(words(width, height));
  data[8] = 8;
  data[9] = RGBA_8BIT;
  return chunk('IHDR', data);
};

function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function encodePng(frame: FrameRGBA): Uint8Array {
  return join([
    Uint8Array.from(SIGNATURE),
    header(frame.width, frame.height),
    chunk('IDAT', compressed(frame)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

function frameControl(sequence: number, frame: FrameRGBA, delayMs: number): Uint8Array {
  const data = new Uint8Array(26);
  data.set(words(sequence, frame.width, frame.height, 0, 0));
  const view = new DataView(data.buffer);
  view.setUint16(20, delayMs);
  view.setUint16(22, 1000);
  return chunk('fcTL', data); // dispose 0 and blend 0: each frame replaces the whole canvas
}

/** Written here because upng-js 2.1.0 truncates multi-frame files. Lossless RGBA, full frames. */
export function encodeApngFrames(
  frames: FrameRGBA[],
  durationsMs: number[],
  loop: boolean,
): Uint8Array {
  const first = frames[0]!;
  const parts = [
    Uint8Array.from(SIGNATURE),
    header(first.width, first.height),
    chunk('acTL', words(frames.length, loop ? 0 : 1)),
  ];
  let sequence = 0;
  frames.forEach((frame, i) => {
    parts.push(frameControl(sequence++, frame, durationsMs[i]!));
    const data = compressed(frame);
    if (i === 0) {
      parts.push(chunk('IDAT', data));
    } else {
      const body = new Uint8Array(data.length + 4);
      body.set(words(sequence++));
      body.set(data, 4);
      parts.push(chunk('fdAT', body));
    }
  });
  parts.push(chunk('IEND', new Uint8Array(0)));
  return join(parts);
}
