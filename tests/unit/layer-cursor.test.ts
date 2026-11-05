import { describe, expect, it } from 'vitest';
import { hashPixels } from '../../src/engine/frame-hash';
import { createLayerCursor } from '../../src/engine/layer-cursor';
import { clearFrame, composite, createFrame } from '../../src/engine/pixelfx/src/core/index.js';
import { layer } from '../helpers/projects';

function shot(
  cursor: ReturnType<typeof createLayerCursor>,
  frame: number,
  part: 'whole' | 'back' | 'front' = 'whole',
) {
  const f = createFrame(128, 128);
  cursor.seek(frame);
  cursor.draw(clearFrame(f), part);
  return hashPixels(composite(f, new Uint8ClampedArray(128 * 128 * 4), null));
}
const blank = hashPixels(new Uint8ClampedArray(128 * 128 * 4));

describe('layer cursor', () => {
  it('gives the same pixels forward, backward, and after jumping', () => {
    const forward = createLayerCursor(layer(), 30, false);
    const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => shot(forward, f));
    const jumpy = createLayerCursor(layer(), 30, false);
    for (const f of [10, 3, 7, 0, 10, 5]) expect(shot(jumpy, f)).toBe(expected[f]);
  });

  it('replays a stateful effect exactly on a backward seek', () => {
    const l = layer({ effectId: 'explosions/small-explosion', x: 64, y: 100 });
    const a = createLayerCursor(l, 30, false);
    const ten = shot(a, 10);
    shot(a, 20);
    expect(shot(a, 10)).toBe(ten);
  });

  it('draws nothing before the start frame', () => {
    const c = createLayerCursor(layer({ startFrame: 5 }), 30, false);
    expect(shot(c, 4)).toBe(blank);
    expect(shot(c, 5)).toBe(shot(createLayerCursor(layer(), 30, false), 0));
  });

  it('steps at speed over fps', () => {
    const half = createLayerCursor(layer({ speed: 0.5 }), 30, false);
    const whole = createLayerCursor(layer(), 60, false);
    expect(shot(half, 4)).not.toBe(blank);
    // same dt, so the same steps and the same pixels
    expect(shot(half, 4)).toBe(shot(whole, 4));
  });

  it('separates back and front parts', () => {
    const c = createLayerCursor(layer({ effectId: 'holy/heal', x: 40, y: 100 }), 30, false);
    expect(shot(c, 12, 'back')).not.toBe(shot(c, 12, 'front'));
  });

  it('applies position keyframes without changing the steps', () => {
    const moved = createLayerCursor(
      layer({
        tracks: {
          x: [
            { frame: 0, value: 64, easing: 'linear' },
            { frame: 10, value: 74, easing: 'linear' },
          ],
        },
      }),
      30,
      false,
    );
    expect(shot(moved, 0)).toBe(shot(createLayerCursor(layer(), 30, false), 0));
    expect(shot(moved, 10)).toBe(shot(createLayerCursor(layer({ x: 74 }), 30, false), 10));
  });

  it('applies light', () => {
    const dim = createLayerCursor(layer({ light: 0 }), 30, false);
    expect(shot(dim, 6)).not.toBe(shot(createLayerCursor(layer(), 30, false), 6));
  });

  it('plays an act with its freeze and shake only on stage', () => {
    const l = layer({ effectId: 'moves/ground-pound', x: 60, y: 110 });
    const onStage = createLayerCursor(l, 30, true);
    let frozen = 0;
    for (let f = 0; f < 60; f++) {
      onStage.seek(f);
      if (onStage.frozen) frozen++;
    }
    expect(frozen).toBeGreaterThan(3);
    onStage.seek(0);
    expect(onStage.shake).toEqual([0, 0]);
    const plain = createLayerCursor(l, 30, false);
    plain.seek(30);
    expect(plain.frozen).toBe(false);
  });

  it('applies act overrides on stage', () => {
    const l = layer({
      effectId: 'moves/ground-pound',
      x: 60,
      y: 110,
      actOverrides: { hits: [{ index: 0, stop: 0.5 }] },
    });
    const c = createLayerCursor(l, 30, true);
    let frozen = 0;
    for (let f = 0; f < 70; f++) {
      c.seek(f);
      if (c.frozen) frozen++;
    }
    expect(frozen).toBeGreaterThanOrEqual(14);
  });

  it('refuses an unknown effect or bad options', () => {
    expect(() => createLayerCursor(layer({ effectId: 'no/such' }), 30, false)).toThrow(
      'unknown-effect',
    );
    expect(() => createLayerCursor(layer({ options: { evil: 1 } }), 30, false)).toThrow(
      'unknown-option',
    );
  });
});
