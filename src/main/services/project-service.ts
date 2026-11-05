import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { ProjectHandle, RecentProject, RecoveryChoice } from '../../shared/contracts/ipc';
import { migrateProject, ProjectVersionError } from '../../shared/migrations/project-migrations';
import { newProject } from '../../shared/models/new-project';
import { ProjectSchema, type ProjectV1 } from '../../shared/schemas/project';
import type { FileSystemAdapter } from './file-system-adapter';

export const PROJECT_FILE = 'project.vfxlab.json';
const BACKUP_FILE = `${PROJECT_FILE}.bak`;
const CORRUPT_FILE = `${PROJECT_FILE}.corrupt`;
const MAX_RECENT = 10;

export type ProjectOpenCode = 'corrupt' | 'unknown-version' | 'not-found';

export class ProjectOpenError extends Error {
  constructor(readonly code: ProjectOpenCode) {
    super(`Could not open project: ${code}`);
  }
}

export function safeFolderName(name: string): string {
  const clean = name
    // oxlint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
  return clean || 'Untitled';
}

export function createProjectService({
  fs,
  recentFile,
}: {
  fs: FileSystemAdapter;
  recentFile: string;
}) {
  type Stored = Omit<RecentProject, 'available'>;

  async function readRecent(): Promise<Stored[]> {
    try {
      const list: unknown = JSON.parse(await fs.read(recentFile));
      return Array.isArray(list) ? (list as Stored[]) : [];
    } catch {
      return [];
    }
  }

  async function writeAtomic(path: string, data: string): Promise<void> {
    const tmp = `${path}.${randomUUID()}.tmp`;
    try {
      await fs.write(tmp, data);
      await fs.flush(tmp);
      await fs.rename(tmp, path);
    } catch (error) {
      await fs.remove(tmp);
      throw error;
    }
  }

  async function remember(path: string, name: string): Promise<void> {
    const next = [
      { path, name, openedAt: new Date().toISOString() },
      ...(await readRecent()).filter((r) => r.path !== path),
    ].slice(0, MAX_RECENT);
    await writeAtomic(recentFile, JSON.stringify(next, null, 2));
  }

  async function readValid(file: string): Promise<ProjectV1 | undefined> {
    try {
      return migrateProject(JSON.parse(await fs.read(file)));
    } catch {
      return undefined;
    }
  }

  async function handleFor(path: string, project: ProjectV1): Promise<ProjectHandle> {
    const missing: string[] = [];
    for (const asset of project.assets) {
      if (!(await fs.exists(join(path, asset.path)))) missing.push(asset.id);
    }
    return { path, project, missingAssets: missing };
  }

  async function openProject(path: string): Promise<ProjectHandle> {
    let text: string;
    try {
      text = await fs.read(join(path, PROJECT_FILE));
    } catch {
      throw new ProjectOpenError('not-found');
    }
    let project: ProjectV1;
    try {
      project = migrateProject(JSON.parse(text));
    } catch (error) {
      throw new ProjectOpenError(
        error instanceof ProjectVersionError ? 'unknown-version' : 'corrupt',
      );
    }
    await remember(path, project.name);
    return handleFor(path, project);
  }

  async function saveProject(
    handle: Pick<ProjectHandle, 'path'>,
    project: ProjectV1,
  ): Promise<void> {
    const text = JSON.stringify(ProjectSchema.parse(project), null, 2);
    const primary = join(handle.path, PROJECT_FILE);
    const tmp = `${primary}.${randomUUID()}.tmp`;
    try {
      await fs.write(tmp, text);
      await fs.flush(tmp);
      if (await readValid(primary)) await fs.copy(primary, join(handle.path, BACKUP_FILE));
      await fs.rename(tmp, primary);
    } catch (error) {
      await fs.remove(tmp);
      throw error;
    }
    await remember(handle.path, project.name);
  }

  return {
    openProject,
    saveProject,

    async createProject(input: { parentDir: string; name: string }): Promise<ProjectHandle> {
      const path = join(input.parentDir, safeFolderName(input.name));
      await fs.mkdir(path);
      for (const dir of ['assets', 'presets', 'exports']) await fs.mkdir(join(path, dir));
      const project = newProject(input.name);
      await writeAtomic(join(path, PROJECT_FILE), JSON.stringify(project, null, 2));
      await remember(path, project.name);
      return handleFor(path, project);
    },

    async recoverProject(path: string): Promise<RecoveryChoice> {
      if (await readValid(join(path, PROJECT_FILE))) return { kind: 'primary-ok' };
      const backup = await readValid(join(path, BACKUP_FILE));
      return backup
        ? { kind: 'backup-available', projectName: backup.name, updatedAt: backup.updatedAt }
        : { kind: 'unrecoverable' };
    },

    /** Keeps the damaged file beside the project so nothing is lost by recovering. */
    async applyBackup(path: string): Promise<ProjectHandle> {
      const backup = join(path, BACKUP_FILE);
      if (!(await readValid(backup))) throw new ProjectOpenError('corrupt');
      const primary = join(path, PROJECT_FILE);
      if (await fs.exists(primary)) await fs.copy(primary, join(path, CORRUPT_FILE));
      await fs.copy(backup, primary);
      return openProject(path);
    },

    async listRecentProjects(): Promise<RecentProject[]> {
      return Promise.all(
        (await readRecent()).map(async (r) => ({
          ...r,
          available: await fs.exists(join(r.path, PROJECT_FILE)),
        })),
      );
    },

    async removeRecentProject(path: string): Promise<void> {
      const next = (await readRecent()).filter((r) => r.path !== path);
      await writeAtomic(recentFile, JSON.stringify(next, null, 2));
    },
  };
}
