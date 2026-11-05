import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listEffects } from '../../src/engine/effect-registry';
import {
  BACKDROPS,
  clearFrame,
  composite,
  createAct,
  createFrame,
  createFx,
} from '../../src/engine/pixelfx/src/core/index.js';

const ROOT = join(__dirname, '../../src/engine/pixelfx/src/fx');
const effects = listEffects();

function renderHash(id: string): string {
  const { module: mod, meta } = effects.find((e) => e.id === id)!;
  const [w, h] = meta.size as [number, number];
  const [x, y] = meta.origin as [number, number];
  const frame = createFrame(w, h);
  const fx = createFx(mod, { x, y, seed: 1 });
  const out = new Uint8ClampedArray(w * h * 4);
  const hash = createHash('sha1');
  const n = Math.max(1, Math.round(meta.duration * 30));
  const every = Math.max(1, Math.floor(n / 30));
  for (let i = 0; i < n; i++) {
    if (i) fx.update(1 / 30);
    if (i % every) continue;
    fx.draw(clearFrame(frame));
    composite(frame, out, null);
    hash.update(out);
  }
  return hash.digest('hex');
}

describe('the vendored library', () => {
  it('has all 244 effects with complete metadata', () => {
    expect(effects).toHaveLength(244);
    for (const { id, meta } of effects) {
      expect(meta.name, id).toBeTruthy();
      expect(meta.desc.length, id).toBeGreaterThanOrEqual(12);
      expect(meta.tags.length, id).toBeGreaterThan(0);
      expect(
        meta.size.every((v: number) => Number.isInteger(v) && v >= 8 && v <= 480),
        id,
      ).toBe(true);
      expect(meta.origin, id).toHaveLength(2);
      expect(meta.duration > 0 && meta.duration <= 12, id).toBe(true);
      expect(BACKDROPS, id).toContain(meta.bg);
    }
  });

  it('uses no unseeded randomness, clocks, or browser and network APIs', () => {
    for (const { id } of effects) {
      const src = readFileSync(join(ROOT, `${id}.js`), 'utf8').replace(/\/\/.*$/gm, '');
      expect(src, id).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now/);
      expect(src, id).not.toMatch(/\b(fetch|XMLHttpRequest|localStorage|document\.|import\()/);
    }
  });

  it('keeps the notices that travel with the code', () => {
    const root = join(ROOT, '../..');
    expect(readFileSync(join(root, 'LICENSE'), 'utf8')).toContain('Hugo Duprez');
    expect(readFileSync(join(root, 'NOTICE.md'), 'utf8')).toContain('Hollow Crown');
  });

  it('renders the same bytes twice for every effect', () => {
    for (const { id } of effects) expect(renderHash(id), id).toBe(renderHash(id));
  });

  it('runs every act to its end', () => {
    const acted = effects.filter((e) => e.hasAct);
    expect(acted).toHaveLength(73);
    for (const { id, module: mod, meta } of acted) {
      const act = createAct(mod, { x: 100, y: 100 });
      const frame = createFrame(400, 300);
      for (let i = 0; i < 900 && !act.done(); i++) {
        act.update(1 / 30);
        if (i % 6 === 0) act.draw(clearFrame(frame));
      }
      if (!meta.loop) expect(act.done(), id).toBe(true);
    }
  });
});
