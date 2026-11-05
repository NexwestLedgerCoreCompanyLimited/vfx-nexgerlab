import type { ProjectV1 } from '../shared/schemas/project';
import { newId } from '../shared/utils/id';

/** Saves the current layers as a new version and makes it active. */
export function createVersion(project: ProjectV1, label: string): ProjectV1 {
  const id = newId();
  return {
    ...project,
    versions: [
      ...project.versions,
      {
        id,
        parentId: project.activeVersionId,
        label: label.slice(0, 120),
        createdAt: new Date().toISOString(),
        layers: project.layers,
        spriteAttachments: project.spriteAttachments,
      },
    ],
    activeVersionId: id,
  };
}

function find(project: ProjectV1, id: string) {
  const version = project.versions.find((v) => v.id === id);
  if (!version) throw new Error(`Unknown version ${id}`);
  return version;
}

export function restoreVersion(project: ProjectV1, id: string): ProjectV1 {
  const version = find(project, id);
  return {
    ...project,
    layers: version.layers,
    spriteAttachments: version.spriteAttachments,
    activeVersionId: id,
  };
}

export function branchVersion(project: ProjectV1, fromId: string, label: string): ProjectV1 {
  return createVersion(restoreVersion(project, fromId), label);
}
