import type { ComposerTurn, EffectLayer, ProjectV1 } from '../../shared/schemas/project';
import { LAYER_SPEEDS } from '../../shared/schemas/project';
import { newId } from '../../shared/utils/id';
import { applyActOverrides, getEffect, listEffects } from '../effect-registry';
import { PAL } from '../pixelfx/src/core/index.js';
import { createEffectLayer } from '../project-factory';
import { createVersion } from '../versions';
import type { ComposerParseResult } from './parser';
import type { ComposerAction } from './vocabulary';

const INTENSITY_FREEZE = 1.3;
const INTENSITY_LIGHT = 0.3;

function strengthen(layer: EffectLayer, up: boolean): EffectLayer {
  const mod = getEffect(layer.effectId);
  const hit = applyActOverrides(mod!, layer.actOverrides).act?.hits?.[0];
  if (hit) {
    const k = up ? INTENSITY_FREEZE : 1 / INTENSITY_FREEZE;
    const edit = {
      index: 0,
      stop: Math.round((hit.stop ?? 0.1) * k * 100) / 100,
      amp: Math.min(16, Math.round((hit.amp ?? 2) * (up ? 1.25 : 0.8))),
    };
    const others = (layer.actOverrides?.hits ?? []).filter((h) => h.index !== 0);
    return { ...layer, actOverrides: { ...layer.actOverrides, hits: [edit, ...others] } };
  }
  const light = layer.light + (up ? INTENSITY_LIGHT : -INTENSITY_LIGHT);
  return { ...layer, light: Math.max(0, Math.min(2, light)) };
}

function applyAction(project: ProjectV1, action: ComposerAction, layerId?: string): ProjectV1 {
  const edit = (change: (l: EffectLayer) => EffectLayer) => ({
    ...project,
    layers: project.layers.map((l) => (l.id === layerId ? change(l) : l)),
  });
  switch (action.type) {
    case 'effect': {
      if (project.layers.some((l) => l.effectId === action.effectId)) return project;
      const entry = listEffects().find((e) => e.id === action.effectId)!;
      const layer = createEffectLayer(
        action.effectId,
        project.canvas.width / 2,
        Math.min(project.canvas.height - 1, entry.meta.origin[1]!),
      );
      return { ...project, layers: [...project.layers, layer] };
    }
    case 'palette':
      return edit((l) => ({
        ...l,
        options: { ...l.options, palette: (PAL as Record<string, string[]>)[action.palette]! },
      }));
    case 'duration':
      return {
        ...project,
        timeline: {
          ...project.timeline,
          frames: Math.round(action.seconds * project.timeline.fps),
        },
      };
    case 'speed':
      return edit((l) => ({
        ...l,
        speed: LAYER_SPEEDS.includes(action.value as 1) ? (action.value as 1) : l.speed,
      }));
    case 'intensity':
      return edit((l) => strengthen(l, action.direction === 'up'));
    case 'flip':
      return edit((l) => ({ ...l, flip: !l.flip }));
    case 'placement':
      return edit((l) => ({ ...l, placement: action.placement }));
  }
}

/** Applies a parsed instruction as a new version. With nothing understood, nothing changes. */
export function applyComposerTurn(
  project: ProjectV1,
  turn: {
    input: string;
    language: 'en' | 'th';
    parsed: ComposerParseResult;
    layerId?: string | undefined;
  },
): ProjectV1 {
  const { recognizedActions, unsupportedTerms } = turn.parsed;
  if (recognizedActions.length === 0) return project;
  const edited = recognizedActions.reduce(
    (p, action) => applyAction(p, action, turn.layerId),
    project,
  );
  const next = createVersion(edited, turn.input.slice(0, 60) || 'Composer');
  const parent = project.composerHistory.at(-1)?.id;
  const record: ComposerTurn = {
    id: newId(),
    input: turn.input.slice(0, 500),
    language: turn.language,
    recognized: recognizedActions.map((a) => JSON.stringify(a)),
    unsupported: unsupportedTerms,
    ...(parent ? { parentTurnId: parent } : {}),
    versionId: next.activeVersionId,
    createdAt: new Date().toISOString(),
  };
  return { ...next, composerHistory: [...next.composerHistory, record] };
}
