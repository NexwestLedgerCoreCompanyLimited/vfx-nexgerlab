import { ProjectSchema, type EffectLayer, type ProjectV1 } from '../shared/schemas/project';
import { newId } from '../shared/utils/id';
import { ENGINE_VERSION, getEffect, type EffectModule } from './effect-registry';
import { actBounds, actSpan } from './pixelfx/src/core/index.js';

const STAGE_PAD = 6;
const MAX_FLOOR = 22; // an act plays above the floor, so the stage does not spend its height on bricks
const MIN_CANVAS = 16;
const MAX_CANVAS = 1024;
const MAX_FRAMES = 600;

const clampSide = (v: number) => Math.max(MIN_CANVAS, Math.min(MAX_CANVAS, Math.ceil(v)));
const oneShotFrames = (mod: EffectModule) =>
  Math.round(mod.meta.duration * mod.meta.fps) + (mod.meta.loop ? 0 : 1);

function stageFor(mod: EffectModule) {
  if (!mod.act) {
    const [width, height] = mod.meta.size as [number, number];
    const [x, y] = mod.meta.origin as [number, number];
    return { width, height, x, y, frames: oneShotFrames(mod) };
  }
  const b = actBounds(mod);
  const bottom = Math.min(b.y1, MAX_FLOOR);
  const span = actSpan(mod);
  const end = mod.meta.loop ? mod.meta.duration : span.to;
  return {
    width: b.x1 - b.x0 + STAGE_PAD * 2,
    height: bottom - b.y0 + STAGE_PAD * 2,
    x: STAGE_PAD - b.x0,
    y: STAGE_PAD - b.y0,
    frames: Math.ceil((end - span.from) * mod.meta.fps) + 1,
  };
}

export function createEffectLayer(effectId: string, x: number, y: number): EffectLayer {
  return {
    id: newId(),
    kind: 'effect',
    effectId,
    engineVersion: ENGINE_VERSION,
    options: {},
    seed: 1,
    flip: false,
    angle: 0,
    x: Math.round(x),
    y: Math.round(y),
    opacity: 1,
    light: 1,
    speed: 1,
    startFrame: 0,
    visible: true,
    blend: 'normal',
    placement: 'standalone',
    tracks: {},
  };
}

export function createProjectFromEffect(
  effectId: string,
  input: { name: string; language: 'en' | 'th' },
): ProjectV1 {
  const mod = getEffect(effectId);
  if (!mod) throw new Error(`Unknown effect ${effectId}`);
  const stage = stageFor(mod);
  const layer = createEffectLayer(effectId, stage.x, stage.y);
  const now = new Date().toISOString();
  const versionId = newId();
  return ProjectSchema.parse({
    schemaVersion: 1,
    id: newId(),
    name: input.name.slice(0, 120),
    canvas: {
      width: clampSide(stage.width),
      height: clampSide(stage.height),
      background: 'transparent',
    },
    timeline: {
      frames: Math.min(MAX_FRAMES, stage.frames),
      fps: mod.meta.fps,
      loop: mod.meta.loop,
    },
    seed: 1,
    assets: [],
    layers: [layer],
    spriteAttachments: [],
    versions: [
      { id: versionId, label: 'Start', createdAt: now, layers: [layer], spriteAttachments: [] },
    ],
    activeVersionId: versionId,
    presets: [],
    composerHistory: [],
    createdAt: now,
    updatedAt: now,
  });
}

/** Exports leave the character out, so an acted effect has fewer frames than its stage. */
export function exportFrameCount(project: ProjectV1): number {
  let frames = 1;
  for (const layer of project.layers) {
    const mod = getEffect(layer.effectId);
    if (mod)
      frames = Math.max(frames, layer.startFrame + Math.ceil(oneShotFrames(mod) / layer.speed));
  }
  return Math.min(project.timeline.frames, frames);
}
