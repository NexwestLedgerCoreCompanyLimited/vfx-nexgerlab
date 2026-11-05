import type { AssetFrame } from '../shared/models/asset';
import type { EffectLayer, ProjectV1, SpriteFx } from '../shared/schemas/project';
import { spriteToActor, supportsCustomActor, type Actor } from './actor-adapter';
import { blendInto } from './blend';
import { createLayerCursor, type LayerCursor, type LayerPart } from './layer-cursor';
import { backdrop, clearFrame, composite, createFrame } from './pixelfx/src/core/index.js';
import type { LayerError, RenderOptions, RenderResult } from './render-types';
import { resolveAttachmentFrame } from './sprite-attachment';
import { renderSpriteFx } from './sprite-fx';
import { sampleNumberTrack } from './timeline';

interface CacheEntry {
  signature: string;
  cursor?: LayerCursor;
  error?: string;
}

export interface RenderCache {
  cursors: Map<string, CacheEntry>;
}

export const createRenderCache = (): RenderCache => ({ cursors: new Map() });

function actorFor(
  layer: EffectLayer,
  assets: ReadonlyMap<string, AssetFrame[]>,
): Actor | undefined {
  if (!layer.actorAssetId || !supportsCustomActor(layer.effectId)) return undefined;
  const frame = assets.get(layer.actorAssetId)?.[0];
  return frame && spriteToActor(frame, { x: frame.width / 2, y: frame.height });
}

function cursorFor(
  layer: EffectLayer,
  fps: number,
  stage: boolean,
  cache: RenderCache,
  assets: ReadonlyMap<string, AssetFrame[]>,
): CacheEntry {
  const signature = JSON.stringify([layer, fps, stage]);
  const key = `${layer.id}:${stage}`;
  let entry = cache.cursors.get(key);
  if (entry?.signature !== signature) {
    entry = { signature };
    try {
      entry.cursor = createLayerCursor(layer, fps, stage, actorFor(layer, assets));
    } catch (error) {
      entry.error = (error as Error).message;
    }
    cache.cursors.set(key, entry);
  }
  return entry;
}

function fillBackground(out: Uint8ClampedArray, hex: string): void {
  const n = Number.parseInt(hex.slice(1), 16);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = n >> 16;
    out[i + 1] = (n >> 8) & 255;
    out[i + 2] = n & 255;
    out[i + 3] = 255;
  }
}

function drawLayer(
  out: Uint8ClampedArray,
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  dx: number,
  dy: number,
  blend: EffectLayer['blend'],
): void {
  const layer = new Uint8ClampedArray(out.length);
  const from = Math.max(0, -dx);
  const to = Math.min(w, width - dx);
  if (to > from) {
    for (let y = Math.max(0, -dy); y < h && y + dy < height; y++) {
      layer.set(
        rgba.subarray((y * w + from) * 4, (y * w + to) * 4),
        ((y + dy) * width + dx + from) * 4,
      );
    }
  }
  blendInto(out, layer, blend, 1);
}

function shifted(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sx: number,
  sy: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const fx = Math.min(width - 1, Math.max(0, x - sx));
      const fy = Math.min(height - 1, Math.max(0, y - sy));
      out.set(
        pixels.subarray((fy * width + fx) * 4, (fy * width + fx) * 4 + 4),
        (y * width + x) * 4,
      );
    }
  }
  return out;
}

/** The single frame renderer behind preview and every export. */
export function renderProjectFrame(
  project: ProjectV1,
  frameIndex: number,
  assets: ReadonlyMap<string, AssetFrame[]>,
  options: RenderOptions,
  cache: RenderCache,
): RenderResult {
  const { width, height, background } = project.canvas;
  const { fps } = project.timeline;
  const out = new Uint8ClampedArray(width * height * 4);
  const errors: LayerError[] = [];
  const { partFilter, includeStage } = options;
  if (background !== 'transparent') fillBackground(out, background);
  if (includeStage && options.backdrop) {
    const groundY = project.layers[0]?.y ?? height;
    const bg: Uint32Array = backdrop(options.backdrop, width, height, groundY);
    out.set(new Uint8ClampedArray(bg.buffer, bg.byteOffset, bg.byteLength));
  }

  const frame = createFrame(width, height);
  const scratch = new Uint8ClampedArray(width * height * 4);
  let shake: [number, number] = [0, 0];

  const paint = (layer: EffectLayer, part: LayerPart) => {
    const entry = cursorFor(layer, fps, includeStage, cache, assets);
    if (!entry.cursor) {
      if (!errors.some((e) => e.layerId === layer.id)) {
        errors.push({ layerId: layer.id, message: entry.error ?? 'unknown' });
      }
      return;
    }
    try {
      entry.cursor.seek(frameIndex);
      entry.cursor.draw(clearFrame(frame), part);
    } catch (error) {
      errors.push({ layerId: layer.id, message: (error as Error).message });
      entry.cursor = undefined;
      entry.error = (error as Error).message;
      return;
    }
    const [sx, sy] = entry.cursor.shake;
    if (sx || sy) shake = [sx, sy];
    composite(frame, scratch.fill(0), null);
    blendInto(
      out,
      scratch,
      layer.blend,
      sampleNumberTrack(layer.tracks.opacity, frameIndex, layer.opacity),
    );
  };

  const single = typeof partFilter === 'object' ? partFilter.layerId : undefined;
  const layers = project.layers.filter((l) => l.visible && (!single || l.id === single));

  if (partFilter !== 'front') {
    for (const layer of layers) {
      if (layer.placement === 'behind-sprite') paint(layer, 'whole');
      else if (layer.placement === 'standalone' && !includeStage) paint(layer, 'back');
    }
  }
  if (partFilter === 'whole') {
    for (const attachment of project.spriteAttachments) {
      const frames = assets.get(attachment.assetId);
      if (!frames || frameIndex >= attachment.outputToSourceFrames.length) continue;
      const resolved = resolveAttachmentFrame(attachment, frameIndex);
      const sprite = frames[resolved.sourceFrameIndex];
      if (!sprite) continue;
      const dx = Math.round(resolved.anchor.x - resolved.pivot.x);
      const dy = Math.round(resolved.anchor.y - resolved.pivot.y);
      const drawFx = (placement: SpriteFx['placement']) => {
        for (const item of attachment.fx ?? []) {
          if (item.placement !== placement) continue;
          const l = renderSpriteFx(item, sprite, frameIndex);
          drawLayer(out, width, height, l.rgba, l.width, l.height, dx + l.dx, dy + l.dy, l.blend);
        }
      };
      drawFx('behind-sprite');
      drawLayer(out, width, height, sprite.rgba, sprite.width, sprite.height, dx, dy, 'normal');
      drawFx('in-front-sprite');
    }
  }
  if (partFilter !== 'behind') {
    for (const layer of layers) {
      if (layer.placement === 'in-front-sprite') paint(layer, 'whole');
      else if (layer.placement === 'standalone') paint(layer, includeStage ? 'whole' : 'front');
    }
  }

  const pixels =
    includeStage && (shake[0] || shake[1]) ? shifted(out, width, height, shake[0], shake[1]) : out;
  return { frame: { width, height, pixels }, errors };
}
