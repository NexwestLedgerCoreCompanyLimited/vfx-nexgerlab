import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../src/renderer/src/locales');
const NAMESPACES = [
  'common',
  'editor',
  'timeline',
  'export',
  'settings',
  'composer',
  'effects',
  'errors',
  'help',
];

const load = (lng: string, ns: string) =>
  JSON.parse(readFileSync(join(ROOT, lng, `${ns}.json`), 'utf8'));
function flat(o: Record<string, unknown>, pre = ''): Record<string, string> {
  return Object.entries(o).reduce<Record<string, string>>((all, [k, v]) => {
    if (typeof v === 'string') all[pre + k] = v;
    else Object.assign(all, flat(v as Record<string, unknown>, `${pre}${k}.`));
    return all;
  }, {});
}
const holes = (s: string) => [...s.matchAll(/\{\{?\s*(\w+)/g)].map((m) => m[1]).sort();

describe('locale catalogs', () => {
  it('ships exactly the release namespaces', () => {
    for (const lng of ['en', 'th']) {
      expect(readdirSync(join(ROOT, lng)).sort()).toEqual(
        NAMESPACES.map((n) => `${n}.json`).sort(),
      );
    }
  });

  it.each(NAMESPACES)('%s has matching keys and placeholders', (ns) => {
    const en = flat(load('en', ns));
    const th = flat(load('th', ns));
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of Object.entries(en)) {
      expect(v.trim(), k).not.toBe('');
      expect(th[k]!.trim(), k).not.toBe('');
      expect(holes(th[k]!), k).toEqual(holes(v));
    }
  });
});

describe('translation request form', () => {
  it('requires locale, language name, reviewer contact, and consent', () => {
    const form = readFileSync(
      join(__dirname, '../../.github/ISSUE_TEMPLATE/translation-request.yml'),
      'utf8',
    );
    for (const id of ['locale', 'language-name', 'reviewer-contact', 'consent']) {
      expect(form).toContain(`id: ${id}`);
    }
    expect(form.match(/required: true/g)!.length).toBeGreaterThanOrEqual(4);
  });
});
