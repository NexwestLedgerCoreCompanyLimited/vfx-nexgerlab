import {
  EffectLayerSchema,
  ProjectSchema,
  type EffectLayer,
  type ProjectV1,
} from '../shared/schemas/project';

type LayerPatch = Partial<Omit<EffectLayer, 'id' | 'kind'>>;

export type EditorCommand = { gestureId?: string | undefined } & (
  | { type: 'set-layer'; layerId: string; patch: LayerPatch }
  | { type: 'add-layer'; layer: EffectLayer }
  | { type: 'remove-layer'; layerId: string }
  | { type: 'move-layer'; layerId: string; toIndex: number }
  | { type: 'set-timeline'; patch: Partial<ProjectV1['timeline']> }
  | { type: 'set-canvas'; patch: Partial<ProjectV1['canvas']> }
  | { type: 'replace'; project: ProjectV1 }
);

function layerIndex(project: ProjectV1, layerId: string): number {
  const index = project.layers.findIndex((l) => l.id === layerId);
  if (index === -1) throw new Error(`No layer ${layerId}`);
  return index;
}

export function applyCommand(project: ProjectV1, command: EditorCommand): ProjectV1 {
  const layers = [...project.layers];
  switch (command.type) {
    case 'set-layer': {
      const index = layerIndex(project, command.layerId);
      const current = layers[index]!;
      layers[index] = EffectLayerSchema.parse({
        ...current,
        ...command.patch,
        id: current.id,
        kind: current.kind,
      });
      return { ...project, layers };
    }
    case 'add-layer':
      return ProjectSchema.parse({ ...project, layers: [...layers, command.layer] });
    case 'remove-layer':
      layers.splice(layerIndex(project, command.layerId), 1);
      return { ...project, layers };
    case 'move-layer': {
      const [layer] = layers.splice(layerIndex(project, command.layerId), 1);
      layers.splice(Math.max(0, Math.min(layers.length, command.toIndex)), 0, layer!);
      return { ...project, layers };
    }
    case 'set-timeline':
      return ProjectSchema.parse({
        ...project,
        timeline: { ...project.timeline, ...command.patch },
      });
    case 'set-canvas':
      return ProjectSchema.parse({ ...project, canvas: { ...project.canvas, ...command.patch } });
    case 'replace':
      return ProjectSchema.parse(command.project);
  }
}
