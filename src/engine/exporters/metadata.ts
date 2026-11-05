import type { ProjectV1 } from '../../shared/schemas/project';
import { ExportMetadataSchema, type ExportMetadataV1 } from '../../shared/schemas/export-metadata';
import { applyActOverrides, getEffect } from '../effect-registry';
import { actTiming } from '../pixelfx/src/core/index.js';
import type { SheetLayout } from './spritesheet';

function actFor(project: ProjectV1) {
  for (const layer of project.layers) {
    const mod = getEffect(layer.effectId);
    if (!mod?.act) continue;
    const t = actTiming(applyActOverrides(mod, layer.actOverrides)) as {
      windup: number;
      recovery: number;
      hits: Array<{ t: number; freeze: number; shake: number; amp: number }>;
    };
    return {
      windup: t.windup,
      recovery: t.recovery,
      hits: t.hits.map(({ t: at, freeze, shake, amp }) => ({ t: at, freeze, shake, amp })),
    };
  }
  return undefined;
}

export interface SheetMetadataInput {
  layout: SheetLayout;
  image: string;
  fps: number;
  loop: boolean;
  pivot: [number, number];
  layers: Array<{ id: string; effectId: string }>;
  source: { projectId: string; versionId: string };
  act?: ReturnType<typeof actFor>;
}

export function buildSheetMetadata(input: SheetMetadataInput): ExportMetadataV1 {
  const { layout, image, fps, loop, pivot, layers, source, act } = input;
  const { frameWidth: w, frameHeight: h } = layout;
  const order = [...new Set(layout.cells.map((c) => c.direction))];
  return ExportMetadataSchema.parse({
    frames: layout.cells.map((cell) => ({
      filename: `${cell.direction} ${cell.frame}`,
      frame: { x: cell.x, y: cell.y, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
      duration: Math.round(1000 / fps),
      direction: cell.direction,
      index: cell.frame,
    })),
    meta: {
      app: 'VFX NexgerLab',
      version: '1',
      image,
      format: 'RGBA8888',
      size: { w: layout.width, h: layout.height },
      scale: '1',
      vfxlab: {
        schemaVersion: 1,
        fps,
        loop,
        frames: layout.cells.length / order.length,
        canvas: [w, h],
        pivot,
        anchor: pivot,
        directions: { count: order.length, order },
        layers,
        source,
        ...(act ? { act } : {}),
      },
    },
  });
}

export function buildExportMetadata(input: {
  project: ProjectV1;
  layout: SheetLayout;
  image: string;
  includeAct: boolean;
}): ExportMetadataV1 {
  const { project, layout, image, includeAct } = input;
  const first = project.layers[0];
  const pivot: [number, number] = [first?.x ?? 0, first?.y ?? 0];
  const act = includeAct ? actFor(project) : undefined;
  return buildSheetMetadata({
    layout,
    image,
    fps: project.timeline.fps,
    loop: project.timeline.loop,
    pivot,
    layers: project.layers.map((l) => ({ id: l.id, effectId: l.effectId })),
    source: { projectId: project.id, versionId: project.activeVersionId },
    ...(act ? { act } : {}),
  });
}
