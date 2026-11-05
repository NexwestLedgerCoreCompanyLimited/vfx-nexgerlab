import { describe, expect, it } from 'vitest';
import {
  ANIMATIONS,
  animationFrames,
  renderCharacterSheet,
  renderCharacterFrame,
} from '../../src/engine/characters/animate';
import { parseCharacterDescription } from '../../src/engine/characters/spec';
import { hashPixels } from '../../src/engine/frame-hash';

describe('parseCharacterDescription', () => {
  it('reads a role and colors in English', () => {
    const r = parseCharacterDescription('a knight with a red cape', 7);
    expect(r.spec).toMatchObject({ role: 'knight', weapon: 'sword', seed: 7 });
    expect(r.spec.top).toBe('#c0342c');
    expect(r.unsupported).toEqual([]);
  });

  it('reads Thai', () => {
    const r = parseCharacterDescription('พ่อมดชุดสีม่วง', 1);
    expect(r.spec.role).toBe('wizard');
    expect(r.spec.top).toBe('#6b2cc0');
  });

  it('reports words it cannot use', () => {
    expect(parseCharacterDescription('knight dragon', 1).unsupported).toEqual(['dragon']);
  });

  it('gives different people for different seeds and the same for one seed', () => {
    const a = parseCharacterDescription('villager', 1).spec;
    expect(parseCharacterDescription('villager', 1).spec).toEqual(a);
    expect(parseCharacterDescription('villager', 2).spec).not.toEqual(a);
  });
});

describe('character rendering', () => {
  const spec = parseCharacterDescription('knight', 1).spec;

  it('lists the animations with frames', () => {
    for (const name of Object.keys(ANIMATIONS))
      expect(animationFrames(name as keyof typeof ANIMATIONS).length, name).toBeGreaterThan(0);
    expect(Object.keys(ANIMATIONS)).toEqual(
      expect.arrayContaining(['idle', 'walk', 'run', 'jump', 'attack', 'cast', 'hurt', 'death']),
    );
  });

  it('repeats exactly and leaves the corners transparent', () => {
    const a = renderCharacterFrame(spec, 'walk', 2, 'S');
    expect(hashPixels(a.pixels)).toBe(
      hashPixels(renderCharacterFrame(spec, 'walk', 2, 'S').pixels),
    );
    expect(a.pixels[3]).toBe(0);
    expect(a.pixels.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
  });

  it('changes across frames, directions, and colors', () => {
    const h = (f: ReturnType<typeof renderCharacterFrame>) => hashPixels(f.pixels);
    const base = renderCharacterFrame(spec, 'walk', 0, 'E');
    expect(h(renderCharacterFrame(spec, 'walk', 3, 'E'))).not.toBe(h(base));
    expect(h(renderCharacterFrame(spec, 'walk', 0, 'S'))).not.toBe(h(base));
    expect(h(renderCharacterFrame({ ...spec, top: '#00ff00' }, 'walk', 0, 'E'))).not.toBe(h(base));
  });

  it('builds a sheet with one row per direction', () => {
    const sheet = renderCharacterSheet(spec, 'walk', 4);
    const frames = animationFrames('walk').length;
    expect(sheet.layout).toMatchObject({ columns: frames, rows: 4 });
    expect(sheet.sheet.width).toBe(sheet.layout.frameWidth * frames);
    expect(sheet.metadata.meta.vfxlab.directions.order).toEqual(['S', 'W', 'N', 'E']);
  });
});
