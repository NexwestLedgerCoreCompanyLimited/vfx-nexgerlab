import { describe, expect, it } from 'vitest';
import { buildExportMetadata } from '../../src/engine/exporters/metadata';
import { calculateSheetLayout } from '../../src/engine/exporters/spritesheet';
import { createProjectFromEffect } from '../../src/engine/project-factory';
import { ExportMetadataSchema } from '../../src/shared/schemas/export-metadata';

const P = (id: string) => createProjectFromEffect(id, { name: 'x', language: 'en' });

function meta(id: string, directions: string[] = ['S'], frames = 4) {
  const project = P(id);
  const layout = calculateSheetLayout({
    frameWidth: project.canvas.width,
    frameHeight: project.canvas.height,
    frames,
    directions: directions as never,
  });
  return {
    project,
    layout,
    data: buildExportMetadata({ project, layout, image: 'heal.png', includeAct: true }),
  };
}

describe('buildExportMetadata', () => {
  it('passes its schema', () => {
    expect(ExportMetadataSchema.safeParse(meta('fire/campfire').data).success).toBe(true);
  });

  it('writes an Aseprite-style frame list with exact rectangles and durations', () => {
    const { data, project } = meta('fire/campfire');
    expect(data.frames).toHaveLength(4);
    expect(data.frames[1]).toMatchObject({
      filename: 'S 1',
      frame: { x: project.canvas.width, y: 0, w: project.canvas.width, h: project.canvas.height },
      rotated: false,
      trimmed: false,
      duration: 33,
    });
  });

  it('records loop, fps, canvas, pivot, directions, layers, and source', () => {
    const { data, project } = meta('fire/campfire', ['S', 'W', 'N', 'E']);
    expect(data.meta.app).toBe('VFX NexgerLab');
    expect(data.meta.vfxlab).toMatchObject({
      schemaVersion: 1,
      fps: 30,
      loop: true,
      canvas: [project.canvas.width, project.canvas.height],
      pivot: [project.layers[0]!.x, project.layers[0]!.y],
      directions: { count: 4, order: ['S', 'W', 'N', 'E'] },
      layers: [{ id: project.layers[0]!.id, effectId: 'fire/campfire' }],
      source: { projectId: project.id, versionId: project.activeVersionId },
    });
    expect(data.frames.filter((f) => f.direction === 'N')).toHaveLength(4);
  });

  it('includes act timing only when there is one', () => {
    expect(meta('moves/ground-pound').data.meta.vfxlab.act?.windup).toBeCloseTo(0.5);
    expect(meta('fire/campfire').data.meta.vfxlab.act).toBeUndefined();
  });

  it('leaves out absolute paths and credentials', () => {
    const text = JSON.stringify(meta('fire/campfire').data);
    expect(text).not.toMatch(/Users|token|password/i);
  });
});
