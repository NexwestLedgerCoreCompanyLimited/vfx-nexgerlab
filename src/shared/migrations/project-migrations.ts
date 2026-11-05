import { ProjectSchema, type ProjectV1 } from '../schemas/project';

export class ProjectVersionError extends Error {
  constructor(readonly version: unknown) {
    super(`Unsupported project schema version: ${String(version)}`);
  }
}

/** The single entry point for reading project JSON. New schema versions upgrade here. */
export function migrateProject(raw: unknown): ProjectV1 {
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (version !== 1) throw new ProjectVersionError(version);
  return ProjectSchema.parse(raw);
}
