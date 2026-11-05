import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blendInto } from '../../src/engine/blend';
import { hashPixels } from '../../src/engine/frame-hash';
import { createRenderCache, renderProjectFrame } from '../../src/engine/render-model';
import type { RenderOptions } from '../../src/engine/render-types';
import type { AssetFrame } from '../../src/shared/models/asset';
import { layer, project, uuid } from '../helpers/projects';

const WHOLE: RenderOptions = { partFilter: 'whole', includeStage: false };
const render = (
  p: ReturnType<typeof project>,
  f: number,
  o: RenderOptions = WHOLE,
  assets = new Map<string, AssetFrame[]>(),
) => renderProjectFrame(p, f, assets, o, createRenderCache());
const hash = (r: ReturnType<typeof render>) => hashPixels(r.frame.pixels);
const px = (r: ReturnType<typeof render>, x: number, y: number) =>
  Array.from(r.frame.pixels.slice((y * r.frame.width + x) * 4, (y * r.frame.width + x) * 4 + 4));

function sprite(color: number[], n = 2, w = 16, h = 16): AssetFrame[] {
  return Array.from({ length: n }, () => {
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) rgba.set(color, i * 4);
    return { width: w, height: h, rgba, durationMs: 100 };
  });
}
const ASSET = uuid(10);
const withSprite = (layers: ReturnType<typeof layer>[]) =>
  project(layers, {
    assets: [
      {
        id: ASSET,
        originalName: 'a.png',
        hash: 'a'.repeat(64),
        kind: 'png',
        path: `assets/${'a'.repeat(64)}.png`,
        width: 16,
        height: 16,
        frameCount: 2,
      },
    ],
    spriteAttachments: [
      {
        id: uuid(11),
        assetId: ASSET,
        outputToSourceFrames: Array.from({ length: 30 }, (_, i) => i % 2),
        frameAnchors: [{ sourceFrameIndex: 1, pivot: { x: 0, y: 0 }, anchor: { x: 10, y: 20 } }],
        behindPartIds: [],
        inFrontPartIds: [],
      },
    ],
  });

describe('blendInto', () => {
  const one = (d: number[], s: number[], mode: Parameters<typeof blendInto>[2], o = 1) => {
    const dst = new Uint8ClampedArray(d);
    blendInto(dst, new Uint8ClampedArray(s), mode, o);
    return Array.from(dst);
  };

  it('keeps transparent pixels transparent', () => {
    expect(one([0, 0, 0, 0], [0, 0, 0, 0], 'normal')).toEqual([0, 0, 0, 0]);
  });

  it('places over nothing and over opaque', () => {
    expect(one([0, 0, 0, 0], [10, 20, 30, 255], 'normal')).toEqual([10, 20, 30, 255]);
    expect(one([100, 100, 100, 255], [200, 0, 0, 255], 'normal', 0.5)).toEqual([150, 50, 50, 255]);
  });

  it('adds, screens, and multiplies', () => {
    expect(one([100, 100, 100, 255], [200, 50, 0, 255], 'add')).toEqual([255, 150, 100, 255]);
    expect(one([100, 100, 100, 255], [255, 0, 0, 255], 'screen')).toEqual([255, 100, 100, 255]);
    expect(one([100, 100, 100, 255], [255, 0, 0, 255], 'multiply')).toEqual([100, 0, 0, 255]);
  });

  it('treats a blend over transparency as normal', () => {
    expect(one([0, 0, 0, 0], [50, 60, 70, 255], 'multiply')).toEqual([50, 60, 70, 255]);
  });
});

describe('renderProjectFrame', () => {
  it('sizes the frame from the canvas and starts transparent', () => {
    const r = render(
      project([], { canvas: { width: 32, height: 16, background: 'transparent' } }),
      0,
    );
    expect([r.frame.width, r.frame.height]).toEqual([32, 16]);
    expect(r.frame.pixels.every((v) => v === 0)).toBe(true);
  });

  it('fills a solid background', () => {
    const r = render(project([], { canvas: { width: 16, height: 16, background: '#102030' } }), 0);
    expect(px(r, 3, 3)).toEqual([16, 32, 48, 255]);
  });

  it('repeats pixels whatever the request order', () => {
    const p = project([layer()]);
    const cache = createRenderCache();
    const once = (f: number) =>
      hashPixels(renderProjectFrame(p, f, new Map(), WHOLE, cache).frame.pixels);
    const ordered = [0, 5, 10].map((f) => hash(render(p, f)));
    expect([once(10), once(0), once(5)]).toEqual([ordered[2], ordered[0], ordered[1]]);
  });

  it('skips hidden layers', () => {
    const hidden = render(project([layer({ visible: false })]), 5);
    expect(hidden.frame.pixels.every((v) => v === 0)).toBe(true);
  });

  it('applies opacity', () => {
    const full = render(project([layer()]), 8).frame.pixels;
    const half = render(project([layer({ opacity: 0.5 })]), 8).frame.pixels;
    const sum = (a: Uint8ClampedArray) => a.reduce((s, _v, i) => (i % 4 === 3 ? s + a[i]! : s), 0);
    expect(sum(half)).toBeLessThan(sum(full));
  });

  it('draws the sprite with its anchor and synchronizes frames', () => {
    const p = withSprite([]);
    const assets = new Map([[ASSET, sprite([1, 2, 3, 255])]]);
    expect(px(render(p, 0, WHOLE, assets), 5, 5)).toEqual([1, 2, 3, 255]);
    expect(px(render(p, 1, WHOLE, assets), 5, 5)).toEqual([0, 0, 0, 0]);
    expect(px(render(p, 1, WHOLE, assets), 12, 22)).toEqual([1, 2, 3, 255]);
  });

  it('orders behind, sprite, then front', () => {
    const behind = layer({
      effectId: 'fire/torch',
      placement: 'behind-sprite',
      x: 8,
      y: 16,
      id: uuid(20),
    });
    const front = layer({
      effectId: 'fire/torch',
      placement: 'in-front-sprite',
      x: 8,
      y: 16,
      id: uuid(21),
    });
    const assets = new Map([[ASSET, sprite([9, 9, 9, 255])]]);
    const behindOnly = render(withSprite([behind]), 8, WHOLE, assets);
    const frontOnly = render(withSprite([front]), 8, WHOLE, assets);
    expect(px(behindOnly, 8, 8)).toEqual([9, 9, 9, 255]);
    expect(hashPixels(frontOnly.frame.pixels)).not.toBe(hashPixels(behindOnly.frame.pixels));
  });

  it('filters parts for export without the sprite', () => {
    const a = layer({ placement: 'behind-sprite', id: uuid(20) });
    const b = layer({ placement: 'in-front-sprite', id: uuid(21), effectId: 'fire/torch' });
    const p = withSprite([a, b]);
    const assets = new Map([[ASSET, sprite([9, 9, 9, 255])]]);
    const behind = render(p, 8, { partFilter: 'behind', includeStage: false }, assets);
    const front = render(p, 8, { partFilter: 'front', includeStage: false }, assets);
    const only = render(p, 8, { partFilter: { layerId: uuid(21) }, includeStage: false }, assets);
    expect(hash(behind)).not.toBe(hash(front));
    expect(hash(only)).toBe(hash(front));
    expect(px(behind, 5, 5)).not.toEqual([9, 9, 9, 255]);
  });

  it('keeps the stage out of exports by default and in on request', () => {
    const p = project([layer({ effectId: 'moves/ground-pound', x: 40, y: 110 })], {
      canvas: { width: 320, height: 128, background: 'transparent' },
    });
    const bare = render(p, 2);
    const stage = render(p, 2, { partFilter: 'whole', includeStage: true, backdrop: 'ground' });
    expect(hash(bare)).not.toBe(hash(stage));
    expect(px(stage, 1, 1)[3]).toBe(255);
    expect(px(bare, 1, 1)[3]).toBe(0);
  });

  it('turns a throwing or missing layer into an error and keeps the rest', () => {
    const good = layer({ id: uuid(30) });
    const bad = layer({ id: uuid(31), effectId: 'no/such' });
    const r = render(project([bad, good]), 6);
    expect(r.errors).toEqual([{ layerId: uuid(31), message: 'unknown-effect' }]);
    expect(hash(r)).toBe(hash(render(project([good]), 6)));
  });

  it('matches the golden hashes shared with the Electron worker test', () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/golden/render.json'), 'utf8'),
    );
    const p = project([layer()]);
    expect([0, 7, 29].map((f) => hash(render(p, f)))).toEqual(golden.campfire);
  });
});
