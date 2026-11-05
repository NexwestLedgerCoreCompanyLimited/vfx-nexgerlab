import type { PresetDescriptor, ProjectV1 } from '../shared/schemas/project';
import { newId } from '../shared/utils/id';
import { createVersion } from './versions';

export function savePreset(project: ProjectV1, input: { name: string; tags: string[] }): ProjectV1 {
  const preset: PresetDescriptor = {
    id: newId(),
    name: input.name,
    tags: input.tags,
    layers: project.layers,
  };
  return { ...project, presets: [...project.presets, preset] };
}

export function searchMyEffects(project: ProjectV1, query: string): PresetDescriptor[] {
  const q = query.trim().toLowerCase();
  return project.presets.filter(
    (p) => !q || [p.name, ...p.tags].join(' ').toLowerCase().includes(q),
  );
}

export function applyPreset(project: ProjectV1, presetId: string): ProjectV1 {
  const preset = project.presets.find((p) => p.id === presetId);
  if (!preset) throw new Error(`Unknown preset ${presetId}`);
  const added = preset.layers.map((l) => ({ ...l, id: newId() }));
  return createVersion({ ...project, layers: [...project.layers, ...added] }, preset.name);
}
