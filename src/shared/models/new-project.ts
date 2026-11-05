import type { ProjectV1 } from '../schemas/project';
import { newId } from '../utils/id';

export function newProject(name: string): ProjectV1 {
  const now = new Date().toISOString();
  const versionId = newId();
  return {
    schemaVersion: 1,
    id: newId(),
    name,
    canvas: { width: 128, height: 128, background: 'transparent' },
    timeline: { frames: 30, fps: 30, loop: false },
    seed: 1,
    assets: [],
    layers: [],
    spriteAttachments: [],
    versions: [
      { id: versionId, label: 'Start', createdAt: now, layers: [], spriteAttachments: [] },
    ],
    activeVersionId: versionId,
    presets: [],
    composerHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}
