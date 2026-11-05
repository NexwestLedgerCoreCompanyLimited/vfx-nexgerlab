import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  ENGINE_VERSION,
  applyActOverrides,
  getEffect,
  listEffects,
  optionControls,
  validateEffectOptions,
} from '../../src/engine/effect-registry';

describe('registry', () => {
  it('exposes 244 effects in 21 categories at a pinned version', () => {
    expect(listEffects()).toHaveLength(244);
    expect(CATEGORIES).toHaveLength(21);
    expect(ENGINE_VERSION).toBe('0.3.0+a841596');
    for (const c of CATEGORIES) {
      expect(
        listEffects().some((e) => e.category === c.id),
        c.id,
      ).toBe(true);
    }
  });

  it('finds real IDs and nothing else', () => {
    expect(getEffect('fire/campfire')?.meta.name).toBe('Campfire');
    for (const id of ['../x', 'fire/../../x', '__proto__', 'constructor', 'fire/', '']) {
      expect(getEffect(id), id).toBeUndefined();
    }
  });

  it('reports what each effect supports', () => {
    const by = (id: string) => listEffects().find((e) => e.id === id)!;
    expect(by('moves/ground-pound')).toMatchObject({ palettes: false, hasAct: true });
    expect(by('fire/campfire')).toMatchObject({ palettes: true, hasAct: false });
    expect(listEffects().filter((e) => e.palettes)).toHaveLength(232);
    expect(listEffects().filter((e) => e.hasBack).length).toBeGreaterThan(100);
  });
});

describe('validateEffectOptions', () => {
  it('accepts known options of the right type', () => {
    expect(
      validateEffectOptions('fire/campfire', { height: 1.5, palette: ['#000000', '#ffffff'] }),
    ).toMatchObject({ ok: true });
  });

  it.each([
    ['unknown effect', 'no/such', {}, 'unknown-effect'],
    ['unknown option', 'fire/campfire', { evil: 1 }, 'unknown-option'],
    ['reserved key', 'fire/campfire', { actor: {} }, 'unknown-option'],
    ['proto key', 'fire/campfire', JSON.parse('{"__proto__": 1}'), 'unknown-option'],
    ['wrong type', 'fire/campfire', { height: 'tall' }, 'bad-value'],
    ['NaN', 'fire/campfire', { height: Number.NaN }, 'bad-value'],
    ['bad ramp', 'fire/campfire', { palette: ['red', 'javascript:1'] }, 'bad-value'],
    ['empty ramp', 'fire/campfire', { palette: [] }, 'bad-value'],
    ['not an object', 'fire/campfire', 7, 'bad-value'],
  ])('rejects %s', (_n, id, options, reason) => {
    expect(validateEffectOptions(id, options)).toEqual({ ok: false, reason });
  });
});

describe('optionControls', () => {
  it('generates controls and leaves out seed and palette', () => {
    const controls = optionControls('fire/campfire');
    expect(controls.map((c) => c.key).sort()).toEqual(['height', 'wood']);
    expect(controls.find((c) => c.key === 'height')).toMatchObject({ kind: 'slider' });
    expect(controls.find((c) => c.key === 'wood')).toMatchObject({ kind: 'palette' });
  });

  it('has nothing to offer for a seed-only effect', () => {
    expect(optionControls('moves/ground-pound')).toEqual([]);
    expect(optionControls('no/such')).toEqual([]);
  });
});

describe('applyActOverrides', () => {
  const mod = getEffect('moves/ground-pound')!;
  const firstKey = () => mod.act.poses[0][0];

  it('returns the module itself without overrides', () => {
    expect(applyActOverrides(mod)).toBe(mod);
  });

  it('copies rather than changes the vendored module', () => {
    const before = JSON.stringify(mod.act);
    const next = applyActOverrides(mod, {
      windupSeconds: 1,
      hits: [{ index: 0, stop: 0.26, amp: 8 }],
    });
    expect(JSON.stringify(mod.act)).toBe(before);
    expect(next.act.hits[0]).toMatchObject({ stop: 0.26, amp: 8 });
    expect(next.draw ?? next.create).toBeTruthy();
    expect(next.meta).toBe(mod.meta);
  });

  it('stretches only the wind-up', () => {
    const next = applyActOverrides(mod, { windupSeconds: 1 });
    expect(next.act.poses[0][0]).toBeCloseTo(-1);
    expect(firstKey()).toBeCloseTo(-0.5);
    const afterZero = (m: typeof mod) =>
      m.act.poses.filter((k: number[]) => k[0]! >= 0).map((k: number[]) => k[0]);
    expect(afterZero(next)).toEqual(afterZero(mod));
  });

  it('ignores a hit index the effect does not have', () => {
    expect(applyActOverrides(mod, { hits: [{ index: 31, stop: 1 }] }).act.hits).toEqual(
      mod.act.hits,
    );
  });
});
