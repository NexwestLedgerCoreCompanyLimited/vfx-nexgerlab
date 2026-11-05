import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { encodePng } from '../../src/engine/exporters/png';

describe('encodePng', () => {
  it('round-trips exact RGBA, including soft alpha', () => {
    const pixels = new Uint8ClampedArray(6 * 5 * 4);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 37) % 256;
    const decoded = PNG.sync.read(Buffer.from(encodePng({ width: 6, height: 5, pixels })));
    expect([decoded.width, decoded.height]).toEqual([6, 5]);
    expect(Array.from(decoded.data)).toEqual(Array.from(pixels));
  });

  it('handles a large transparent frame', () => {
    const pixels = new Uint8ClampedArray(512 * 512 * 4);
    expect(PNG.sync.read(Buffer.from(encodePng({ width: 512, height: 512, pixels }))).width).toBe(
      512,
    );
  });
});
