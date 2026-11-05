import { describe, expect, it } from 'vitest';
import UPNG from 'upng-js';
import { encodeApng } from '../../src/engine/exporters/apng';
import type { FrameRGBA } from '../../src/engine/render-types';

const solid = (rgba: number[], w = 3, h = 3): FrameRGBA => {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) pixels.set(rgba, i * 4);
  return { width: w, height: h, pixels };
};

describe('encodeApng', () => {
  it('keeps every frame, its timing, and exact pixels', () => {
    const bytes = encodeApng([solid([10, 20, 30, 128]), solid([200, 100, 50, 255])], [100, 40]);
    expect(Array.from(bytes.slice(1, 4))).toEqual([80, 78, 71]);
    const image = UPNG.decode(bytes.slice().buffer);
    expect(image.frames).toHaveLength(2);
    expect(image.frames.map((f) => f.delay)).toEqual([100, 40]);
    const rgba = UPNG.toRGBA8(image).map((b) => Array.from(new Uint8Array(b).slice(0, 4)));
    expect(rgba[0]).toEqual([10, 20, 30, 128]);
    expect(rgba[1]).toEqual([200, 100, 50, 255]);
  });

  it('writes complete chunks with the loop setting and a sequence that counts up', () => {
    const chunks = (b: Uint8Array) => {
      const v = new DataView(b.buffer, b.byteOffset);
      const out: Array<[string, number]> = [];
      for (let o = 8; o < b.length; o += 12 + v.getUint32(o)) {
        out.push([String.fromCharCode(...b.slice(o + 4, o + 8)), o]);
      }
      return { out, v };
    };
    const frames = [solid([1, 2, 3, 255]), solid([4, 5, 6, 255]), solid([7, 8, 9, 255])];
    const bytes = encodeApng(frames, [10, 20, 30], false);
    const { out, v } = chunks(bytes);
    expect(out.map(([t]) => t)).toEqual([
      'IHDR',
      'acTL',
      'fcTL',
      'IDAT',
      'fcTL',
      'fdAT',
      'fcTL',
      'fdAT',
      'IEND',
    ]);
    const acTL = out[1]![1];
    expect([v.getUint32(acTL + 8), v.getUint32(acTL + 12)]).toEqual([3, 1]);
    const fcTLs = out.filter(([t]) => t === 'fcTL').map(([, o]) => v.getUint32(o + 8));
    expect(fcTLs).toEqual([0, 1, 3]);
  });

  it('refuses empty input', () => {
    expect(() => encodeApng([], [])).toThrow();
  });
});
