import { describe, expect, it } from 'vitest';
import { generateNormalMap } from '../../src/engine/normal-map';
import type { FrameRGBA } from '../../src/engine/render-types';

function frame(
  w: number,
  h: number,
  lum: (x: number, y: number) => number,
  alpha = 255,
): FrameRGBA {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++)
      pixels.set([lum(x, y), lum(x, y), lum(x, y), alpha], (y * w + x) * 4);
  }
  return { width: w, height: h, pixels };
}
const at = (f: FrameRGBA, x: number, y: number) =>
  Array.from(f.pixels.slice((y * f.width + x) * 4, (y * f.width + x) * 4 + 4));

describe('generateNormalMap', () => {
  it('gives neutral flat normals on a flat image', () => {
    expect(
      at(
        generateNormalMap(
          frame(4, 4, () => 100),
          { strength: 2 },
        ),
        1,
        1,
      ),
    ).toEqual([128, 128, 255, 255]);
  });

  it('gives neutral normals at strength 0', () => {
    expect(
      at(
        generateNormalMap(
          frame(4, 4, (x) => x * 80),
          { strength: 0 },
        ),
        1,
        1,
      ),
    ).toEqual([128, 128, 255, 255]);
  });

  it('points away from a rise in x', () => {
    expect(
      at(
        generateNormalMap(
          frame(5, 5, (x) => x * 50),
          { strength: 2 },
        ),
        2,
        2,
      )[0],
    ).toBeLessThan(128);
    expect(
      at(
        generateNormalMap(
          frame(5, 5, (x) => 200 - x * 50),
          { strength: 2 },
        ),
        2,
        2,
      )[0],
    ).toBeGreaterThan(128);
  });

  it('uses OpenGL +Y up: height rising downward gives green above 128', () => {
    expect(
      at(
        generateNormalMap(
          frame(5, 5, (_x, y) => y * 50),
          { strength: 2 },
        ),
        2,
        2,
      )[1],
    ).toBeGreaterThan(128);
    expect(
      at(
        generateNormalMap(
          frame(5, 5, (_x, y) => 200 - y * 50),
          { strength: 2 },
        ),
        2,
        2,
      )[1],
    ).toBeLessThan(128);
  });

  it('clamps at the edges', () => {
    const n = generateNormalMap(
      frame(3, 3, (x) => x * 100),
      { strength: 1 },
    );
    expect(n.pixels.length).toBe(36);
    expect(at(n, 0, 0)[2]).toBeGreaterThan(0);
  });

  it('copies alpha exactly', () => {
    const f = frame(3, 3, (x) => x * 40, 77);
    expect(at(generateNormalMap(f, { strength: 3 }), 1, 1)[3]).toBe(77);
  });

  it.each([-1, 11, Number.NaN, Number.POSITIVE_INFINITY])('rejects strength %s', (strength) => {
    expect(() =>
      generateNormalMap(
        frame(2, 2, () => 0),
        { strength },
      ),
    ).toThrow(RangeError);
  });

  it('keeps the frame size', () => {
    expect(
      generateNormalMap(
        frame(7, 3, () => 0),
        { strength: 1 },
      ),
    ).toMatchObject({ width: 7, height: 3 });
  });
});
