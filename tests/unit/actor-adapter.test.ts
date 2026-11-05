import { describe, expect, it } from 'vitest';
import { spriteToActor, supportsCustomActor } from '../../src/engine/actor-adapter';
import { getEffect, listEffects } from '../../src/engine/effect-registry';
import { createLayerCursor } from '../../src/engine/layer-cursor';
import {
  clearFrame,
  createFrame,
  createFx,
  stockActor,
} from '../../src/engine/pixelfx/src/core/index.js';
import allowlist from '../../src/engine/actor-allowlist.json';
import type { AssetFrame } from '../../src/shared/models/asset';
import { layer } from '../helpers/projects';

function sprite(w: number, h: number): AssetFrame {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba.set([200, 180, 160, i % 7 === 0 ? 0 : 255], i * 4);
  return { width: w, height: h, rgba, durationMs: 100 };
}
const SPRITES = [sprite(12, 20), sprite(32, 48), sprite(8, 8)];
const FEET = (f: AssetFrame) => ({ x: f.width / 2, y: f.height });

describe('spriteToActor', () => {
  it('fills the stock actor shape', () => {
    const actor = spriteToActor(SPRITES[0]!, FEET(SPRITES[0]!));
    expect(Object.keys(actor).sort()).toEqual(Object.keys(stockActor(2)).sort());
    expect(actor.mask).toMatchObject({ w: 12, h: 20 });
    expect(actor.pixels).toHaveLength(240);
    expect([actor.x, actor.y]).toEqual([-6, -20]);
  });

  it('marks transparent pixels as empty', () => {
    const actor = spriteToActor(SPRITES[0]!, FEET(SPRITES[0]!));
    expect(actor.mask.data[0]).toBe(0);
    expect(actor.pixels[0]).toBe(0);
    expect(actor.mask.data[1]).toBe(1);
  });
});

describe('the allowlist', () => {
  it('holds only acted effects and reports support', () => {
    const acted = new Set(
      listEffects()
        .filter((e) => e.meta.actor)
        .map((e) => e.id),
    );
    for (const id of allowlist) expect(acted.has(id), id).toBe(true);
    expect(supportsCustomActor(allowlist[0]!)).toBe(true);
    expect(supportsCustomActor('fire/campfire')).toBe(false);
  });

  it('runs every allowlisted effect to its end with differently shaped sprites', () => {
    for (const id of allowlist) {
      const mod = getEffect(id)!;
      const [w, h] = mod.meta.size as [number, number];
      const frame = createFrame(w, h);
      for (const s of SPRITES) {
        const fx = createFx(mod, { x: 40, y: 60, actor: spriteToActor(s, FEET(s)) });
        for (let i = 0; i < Math.ceil(mod.meta.duration * 30); i += 3) {
          fx.update(1 / 10);
          fx.draw(clearFrame(frame));
        }
      }
    }
  });
});

describe('cursor with a custom actor', () => {
  it('passes the actor to the effect and skips the stock act', () => {
    const id = allowlist.find((a) => a.startsWith('status/'))!;
    const c = createLayerCursor(
      layer({ effectId: id, x: 40, y: 60 }),
      30,
      true,
      spriteToActor(SPRITES[1]!, FEET(SPRITES[1]!)),
    );
    c.seek(10);
    expect(c.frozen).toBe(false);
    c.draw(createFrame(128, 128), 'whole');
  });
});
