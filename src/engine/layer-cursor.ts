import type { EffectLayer } from '../shared/schemas/project';
import { applyActOverrides, getEffect, validateEffectOptions } from './effect-registry';
import { createAct, createFx } from './pixelfx/src/core/index.js';
import { sampleNumberTrack } from './timeline';

export type LayerPart = 'whole' | 'back' | 'front';

export interface LayerCursor {
  seek(frameIndex: number): void;
  draw(frame: unknown, part: LayerPart): void;
  readonly frozen: boolean;
  readonly shake: [number, number];
}

interface Live {
  update(dt: number): void;
  draw(frame: unknown, part?: unknown): void;
  options?: Record<string, unknown>;
  fx?: { options: Record<string, unknown> };
  frozen?: boolean;
  shake?: [number, number];
}

/** One effect layer on the project's frame grid. Stepping is the only way time moves, so any frame can be replayed. */
export function createLayerCursor(layer: EffectLayer, fps: number, stage: boolean): LayerCursor {
  const validated = validateEffectOptions(layer.effectId, layer.options);
  if (!validated.ok) throw new Error(validated.reason);
  const base = getEffect(layer.effectId)!;
  const acted = stage && Boolean(base.act);
  const mod = acted ? applyActOverrides(base, layer.actOverrides) : base;
  const dt = layer.speed / fps;

  let live: Live;
  let at = 0;
  let current = 0;
  const rebuild = () => {
    const options = {
      ...validated.options,
      seed: layer.seed,
      flip: layer.flip,
      angle: layer.angle,
      x: layer.x,
      y: layer.y,
      light: layer.light,
    };
    live = (acted ? createAct : createFx)(mod, options) as Live;
    at = 0;
  };
  rebuild();

  return {
    seek(frameIndex) {
      current = frameIndex;
      const local = frameIndex - layer.startFrame;
      if (local < at) rebuild();
      for (; at < local; at++) live.update(dt);
    },
    draw(frame, part) {
      if (current < layer.startFrame) return;
      const options = (live.fx ?? live).options!;
      options.light = sampleNumberTrack(layer.tracks.light, current, layer.light);
      if (acted) {
        live.draw(frame);
        return;
      }
      options.x = Math.round(sampleNumberTrack(layer.tracks.x, current, layer.x));
      options.y = Math.round(sampleNumberTrack(layer.tracks.y, current, layer.y));
      live.draw(frame, part === 'whole' ? undefined : part);
    },
    get frozen() {
      return Boolean(live.frozen);
    },
    get shake() {
      return live.shake ?? [0, 0];
    },
  };
}
