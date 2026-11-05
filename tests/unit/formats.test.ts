import { describe, expect, it } from 'vitest';
import { encodeAseprite } from '../../src/engine/exporters/aseprite';
import { encodeBmp } from '../../src/engine/exporters/bmp';
import { encodeTga } from '../../src/engine/exporters/tga';
import { assembleAnimatedWebp } from '../../src/engine/exporters/webp';
import { decodeAseprite } from '../../src/engine/importers/aseprite';
import type { FrameRGBA } from '../../src/engine/render-types';

const frame = (c: number[], w = 3, h = 2): FrameRGBA => {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) pixels.set(c, i * 4);
  return { width: w, height: h, pixels };
};

describe('BMP', () => {
  it('writes a 32-bit top-down bitmap in BGRA', () => {
    const b = encodeBmp(frame([10, 20, 30, 128]));
    const v = new DataView(b.buffer);
    expect(String.fromCharCode(b[0]!, b[1]!)).toBe('BM');
    expect(v.getUint32(2, true)).toBe(b.length);
    expect(v.getInt32(18, true)).toBe(3);
    expect(v.getInt32(22, true)).toBe(-2);
    expect(v.getUint16(28, true)).toBe(32);
    const data = v.getUint32(10, true);
    expect(Array.from(b.slice(data, data + 4))).toEqual([30, 20, 10, 128]);
  });
});

describe('TGA', () => {
  it('writes a top-left 32-bit image in BGRA', () => {
    const b = encodeTga(frame([10, 20, 30, 128]));
    expect(b[2]).toBe(2);
    expect(b[16]).toBe(32);
    expect(b[17]).toBe(0x28);
    expect(new DataView(b.buffer).getUint16(12, true)).toBe(3);
    expect(Array.from(b.slice(18, 22))).toEqual([30, 20, 10, 128]);
  });
});

describe('Aseprite', () => {
  it('round-trips frames, timing, and exact pixels', () => {
    const input = [frame([200, 10, 20, 255]), frame([1, 2, 3, 77])];
    const bytes = encodeAseprite(input, [100, 50]);
    const v = new DataView(bytes.buffer, bytes.byteOffset);
    expect(v.getUint16(4, true)).toBe(0xa5e0);
    expect(v.getUint32(0, true)).toBe(bytes.length);
    const out = decodeAseprite(bytes);
    expect(out).toHaveLength(2);
    expect(out[1]!.durationMs).toBe(50);
    expect(Array.from(out[0]!.rgba.slice(0, 4))).toEqual([200, 10, 20, 255]);
    expect(Array.from(out[1]!.rgba.slice(0, 4))).toEqual([1, 2, 3, 77]);
  });

  it.each([
    ['too short', new Uint8Array(10)],
    ['wrong magic', new Uint8Array(200)],
  ])('rejects %s', (_n, bytes) => {
    expect(() => decodeAseprite(bytes)).toThrow();
  });

  it('rejects a truncated file', () => {
    const bytes = encodeAseprite([frame([1, 1, 1, 255])], [100]);
    expect(() => decodeAseprite(bytes.slice(0, bytes.length - 5))).toThrow();
  });

  it('rejects a header that claims a huge canvas', () => {
    const bytes = encodeAseprite([frame([1, 1, 1, 255])], [100]);
    new DataView(bytes.buffer).setUint16(8, 60000, true);
    expect(() => decodeAseprite(bytes)).toThrow();
  });
});

describe('animated WebP', () => {
  const still = (size: number) => {
    const payload = new Uint8Array(size).fill(7);
    const out = new Uint8Array(12 + 8 + size + (size & 1));
    const v = new DataView(out.buffer);
    out.set(new TextEncoder().encode('RIFF'));
    v.setUint32(4, out.length - 8, true);
    out.set(new TextEncoder().encode('WEBPVP8L'), 8);
    v.setUint32(16, size, true);
    out.set(payload, 20);
    return out;
  };

  it('wraps still frames in VP8X, ANIM, and ANMF chunks', () => {
    const b = assembleAnimatedWebp([still(9), still(4)], [100, 50], 16, 8, true);
    const text = new TextDecoder('latin1').decode(b);
    expect(text.slice(0, 4)).toBe('RIFF');
    expect(text.slice(8, 16)).toBe('WEBPVP8X');
    expect(text.match(/ANMF/g)).toHaveLength(2);
    expect(text).toContain('ANIM');
    expect(new DataView(b.buffer).getUint32(4, true)).toBe(b.length - 8);
  });

  it('refuses something that is not WebP', () => {
    expect(() => assembleAnimatedWebp([new Uint8Array(30)], [10], 4, 4, true)).toThrow();
  });
});
