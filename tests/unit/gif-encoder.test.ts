import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js';
import { describe, expect, it } from 'vitest';
import { encodeGif } from '../../src/engine/exporters/gif';
import type { FrameRGBA } from '../../src/engine/render-types';

const solid = (rgba: number[], w = 4, h = 4): FrameRGBA => {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) pixels.set(rgba, i * 4);
  return { width: w, height: h, pixels };
};
const decode = (bytes: Uint8Array) =>
  decompressFrames(parseGIF(bytes.slice().buffer), true) as ParsedFrame[];

describe('encodeGif', () => {
  it('writes a GIF with the frames and timing', () => {
    const bytes = encodeGif([solid([255, 0, 0, 255]), solid([0, 255, 0, 255])], [100, 200], true);
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe('GIF89a');
    const frames = decode(bytes);
    expect(frames).toHaveLength(2);
    expect(frames.map((f) => f.delay)).toEqual([100, 200]);
  });

  it('marks fully transparent pixels transparent and clears between frames', () => {
    const half = solid([200, 100, 50, 255]);
    half.pixels.fill(0, 0, 8);
    const [first] = decode(encodeGif([half], [100], true));
    expect(first!.patch[3]).toBe(0);
    expect(first!.patch[63]).toBe(255);
    expect(first!.disposalType).toBe(2);
  });

  it('writes a loop extension only when looping', () => {
    const text = (b: Uint8Array) => new TextDecoder('latin1').decode(b);
    expect(text(encodeGif([solid([1, 2, 3, 255])], [50], true))).toContain('NETSCAPE');
    expect(text(encodeGif([solid([1, 2, 3, 255])], [50], false))).not.toContain('NETSCAPE');
  });

  it('refuses empty input', () => {
    expect(() => encodeGif([], [], true)).toThrow();
  });
});
