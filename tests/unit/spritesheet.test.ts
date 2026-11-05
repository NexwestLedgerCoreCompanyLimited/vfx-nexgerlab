import { describe, expect, it } from 'vitest';
import { calculateSheetLayout, packSheet } from '../../src/engine/exporters/spritesheet';

describe('calculateSheetLayout', () => {
  it('lays out one direction near square', () => {
    const l = calculateSheetLayout({
      frameWidth: 80,
      frameHeight: 104,
      frames: 58,
      directions: ['S'],
    });
    expect(l).toMatchObject({ columns: 9, rows: 7, width: 720, height: 728 });
    expect(l.cells[10]).toMatchObject({ x: 80, y: 104, frame: 10, direction: 'S' });
  });

  it('gives one row per direction in order', () => {
    const l = calculateSheetLayout({
      frameWidth: 10,
      frameHeight: 10,
      frames: 3,
      directions: ['S', 'W', 'N', 'E'],
    });
    expect(l).toMatchObject({ columns: 3, rows: 4, width: 30, height: 40 });
    expect(l.cells.find((c) => c.direction === 'N' && c.frame === 2)).toMatchObject({
      x: 20,
      y: 20,
    });
  });

  it('handles a single frame and 600 frames', () => {
    expect(
      calculateSheetLayout({ frameWidth: 8, frameHeight: 8, frames: 1, directions: ['S'] }),
    ).toMatchObject({ columns: 1, rows: 1 });
    const big = calculateSheetLayout({
      frameWidth: 8,
      frameHeight: 8,
      frames: 600,
      directions: ['S'],
    });
    expect(big.cells).toHaveLength(600);
    expect(new Set(big.cells.map((c) => `${c.x},${c.y}`)).size).toBe(600);
  });
});

describe('packSheet', () => {
  it('copies pixels exactly with no rescale', () => {
    const frame = (v: number) => ({
      width: 2,
      height: 2,
      pixels: new Uint8ClampedArray(16).fill(v),
    });
    const layout = calculateSheetLayout({
      frameWidth: 2,
      frameHeight: 2,
      frames: 2,
      directions: ['S'],
    });
    const sheet = packSheet(layout, [frame(10), frame(20)]);
    expect([sheet.width, sheet.height]).toEqual([4, 2]);
    expect(sheet.pixels[0]).toBe(10);
    expect(sheet.pixels[8]).toBe(20);
    expect(sheet.pixels.every((v) => v === 10 || v === 20)).toBe(true);
  });

  it('refuses a frame of the wrong size', () => {
    const layout = calculateSheetLayout({
      frameWidth: 2,
      frameHeight: 2,
      frames: 1,
      directions: ['S'],
    });
    expect(() =>
      packSheet(layout, [{ width: 3, height: 2, pixels: new Uint8ClampedArray(24) }]),
    ).toThrow();
  });
});
