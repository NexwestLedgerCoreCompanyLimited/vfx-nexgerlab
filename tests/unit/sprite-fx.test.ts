import { describe, expect, it } from 'vitest';
import { renderSpriteFx } from '../../src/engine/sprite-fx';
import type { AssetFrame } from '../../src/shared/models/asset';
import type { SpriteFx } from '../../src/shared/schemas/project';

function sprite(shift = 0): AssetFrame {
  const w = 8;
  const h = 8;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 2; y < 6; y++) {
    for (let x = 2 + shift; x < 6 + shift; x++) rgba.set([100, 120, 140, 255], (y * w + x) * 4);
  }
  return { width: w, height: h, rgba, durationMs: 100 };
}
const fx = (kind: SpriteFx['kind'], strength = 1): SpriteFx => ({
  id: '00000000-0000-4000-8000-000000000001',
  kind,
  color: '#32e6f2',
  strength,
  placement: 'in-front-sprite',
});
const alpha = (l: ReturnType<typeof renderSpriteFx>, x: number, y: number) =>
  l.rgba[((y - l.dy) * l.width + (x - l.dx)) * 4 + 3]!;

describe('sprite effects', () => {
  it.each(['aura', 'glow', 'light', 'recolor'] as const)('%s repeats exactly', (kind) => {
    expect(renderSpriteFx(fx(kind), sprite(), 7).rgba).toEqual(
      renderSpriteFx(fx(kind), sprite(), 7).rgba,
    );
  });

  it.each(['aura', 'glow'] as const)('%s follows the sprite frame', (kind) => {
    const a = renderSpriteFx(fx(kind), sprite(0), 0);
    const b = renderSpriteFx(fx(kind), sprite(2), 0);
    expect(a.rgba).not.toEqual(b.rgba);
  });

  it('aura outlines the silhouette and leaves the inside empty', () => {
    const l = renderSpriteFx(fx('aura'), sprite(), 0);
    expect(alpha(l, 3, 3)).toBe(0);
    expect(alpha(l, 1, 3)).toBeGreaterThan(0);
    expect(alpha(l, -2, -2)).toBe(0);
  });

  it('aura pulses over time', () => {
    expect(renderSpriteFx(fx('aura'), sprite(), 0).rgba).not.toEqual(
      renderSpriteFx(fx('aura'), sprite(), 5).rgba,
    );
  });

  it('glow fades with distance and uses add blending', () => {
    const l = renderSpriteFx(fx('glow'), sprite(), 0);
    expect(alpha(l, 1, 3)).toBeGreaterThan(alpha(l, -1, 3));
    expect(l.blend).toBe('add');
  });

  it('light and recolor keep the source alpha exactly', () => {
    for (const kind of ['light', 'recolor'] as const) {
      const l = renderSpriteFx(fx(kind), sprite(), 0);
      expect(alpha(l, 3, 3)).toBe(255);
      expect(alpha(l, 0, 0)).toBe(0);
    }
  });

  it('recolor shifts color but keeps shading', () => {
    const l = renderSpriteFx(fx('recolor'), sprite(), 0);
    const i = ((3 - l.dy) * l.width + (3 - l.dx)) * 4;
    expect(Array.from(l.rgba.slice(i, i + 3))).not.toEqual([100, 120, 140]);
  });

  it('strength 0 draws nothing', () => {
    for (const kind of ['aura', 'glow', 'light', 'recolor'] as const) {
      const l = renderSpriteFx(fx(kind, 0), sprite(), 0);
      expect(
        l.rgba.every((v, i) => i % 4 !== 3 || v === 0),
        kind,
      ).toBe(true);
    }
  });

  it('handles a blank frame', () => {
    const blank = { width: 4, height: 4, rgba: new Uint8ClampedArray(64), durationMs: 100 };
    expect(renderSpriteFx(fx('aura'), blank, 0).rgba.every((v) => v === 0)).toBe(true);
  });
});
