import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, listEffects } from '../../src/engine/effect-registry';

const load = (l: string) =>
  JSON.parse(
    readFileSync(join(__dirname, `../../src/renderer/src/locales/${l}/effects.json`), 'utf8'),
  );
const THAI = /[฀-๿]/;

describe.each(['en', 'th'])('%s effect catalog', (lng) => {
  const catalog = load(lng);

  it('covers every effect and category', () => {
    expect(Object.keys(catalog.items).sort()).toEqual(
      listEffects()
        .map((e) => e.id)
        .sort(),
    );
    expect(Object.keys(catalog.categories).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
  });

  it('has a name, description, and search terms for each', () => {
    for (const [id, item] of Object.entries<Record<string, string>>(catalog.items)) {
      for (const field of ['name', 'desc', 'terms'])
        expect(item[field]?.trim(), `${id}.${field}`).toBeTruthy();
    }
  });
});

it('writes Thai entries in Thai', () => {
  for (const [id, item] of Object.entries<Record<string, string>>(load('th').items)) {
    expect(item.desc, id).toMatch(THAI);
    expect(item.terms, id).toMatch(/\S/);
  }
});

it('uses no gendered pronouns in English descriptions', () => {
  for (const [id, item] of Object.entries<Record<string, string>>(load('en').items)) {
    expect(item.desc, id).not.toMatch(/\b(he|his|him)\b/i);
  }
});
