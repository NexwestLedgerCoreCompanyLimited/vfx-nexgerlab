import { describe, expect, it } from 'vitest';
import { TERMS } from '../../src/engine/composer/vocabulary';
import { getEffect } from '../../src/engine/effect-registry';
import { EFFECT_FAMILIES, SPRITE_FAMILIES } from '../../src/engine/effect-families';

const FAMILIES = [
  'fire',
  'explosions',
  'smoke',
  'lightning',
  'energy-orbs',
  'magic-circles',
  'portals',
  'healing-beams',
  'shields',
  'shockwaves',
  'sword-slashes',
  'hit-sparks',
  'auras',
  'glow',
  'lighting',
  'recolors',
  'projectiles',
  'ice-spikes',
  'bubbling',
];

describe('effect families', () => {
  it('covers the 19 families', () => {
    expect(Object.keys(EFFECT_FAMILIES).sort()).toEqual([...FAMILIES].sort());
  });

  it.each(FAMILIES)('%s maps to real effects or sprite effects', (family) => {
    const ids = EFFECT_FAMILIES[family as keyof typeof EFFECT_FAMILIES];
    for (const id of ids) expect(getEffect(id), id).toBeTruthy();
    const sprite = SPRITE_FAMILIES[family as keyof typeof SPRITE_FAMILIES];
    expect(ids.length + (sprite ? 1 : 0)).toBeGreaterThan(0);
  });

  it('has vocabulary that points only at real effects', () => {
    for (const { term, action } of TERMS) {
      if (action.type === 'effect') expect(getEffect(action.effectId), term).toBeTruthy();
    }
  });
});
