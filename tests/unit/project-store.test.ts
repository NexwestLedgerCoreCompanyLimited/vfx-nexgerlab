import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  nodeFileSystem,
  type FileSystemAdapter,
} from '../../src/main/services/file-system-adapter';
import {
  createProjectService,
  ProjectOpenError,
  safeFolderName,
} from '../../src/main/services/project-service';
import { ProjectSchema } from '../../src/shared/schemas/project';

const FILE = 'project.vfxlab.json';
const fixtures = join(__dirname, '../fixtures/projects');
const tmp = () => mkdtempSync(join(tmpdir(), 'proj-'));
const copy = (name: string) => {
  const dir = join(tmp(), name);
  cpSync(join(fixtures, name), dir, { recursive: true });
  return dir;
};
const service = (fs: FileSystemAdapter = nodeFileSystem, state = tmp()) =>
  createProjectService({ fs, recentFile: join(state, 'recent.json') });
const read = (dir: string, f = FILE) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

describe('project service', () => {
  it('creates a project folder with a Thai name', async () => {
    const parent = tmp();
    const h = await service().createProject({ parentDir: parent, name: 'เอฟเฟกต์ ไฟ/ฟ้า' });
    expect(h.project.name).toBe('เอฟเฟกต์ ไฟ/ฟ้า');
    expect(readdirSync(h.path).sort()).toEqual(['assets', 'exports', 'presets', FILE].sort());
    expect(h.path.startsWith(parent)).toBe(true);
    expect(ProjectSchema.safeParse(read(h.path)).success).toBe(true);
  });

  it('refuses to overwrite an existing folder', async () => {
    const parent = tmp();
    const s = service();
    await s.createProject({ parentDir: parent, name: 'a' });
    await expect(s.createProject({ parentDir: parent, name: 'a' })).rejects.toThrow();
  });

  it.each([
    ['a/b', 'a b'],
    ['..', 'Untitled'],
    ['  ', 'Untitled'],
    ['CON?', 'CON'],
  ])('makes a safe folder name from %s', (input, out) => {
    expect(safeFolderName(input)).toBe(out);
  });

  it('opens a valid project and reports missing assets', async () => {
    const h = await service().openProject(copy('missing-asset'));
    expect(h.missingAssets).toHaveLength(1);
  });

  it('refuses a corrupt file without touching it', async () => {
    const dir = copy('corrupt');
    const before = readFileSync(join(dir, FILE), 'utf8');
    await expect(service().openProject(dir)).rejects.toMatchObject({ code: 'corrupt' });
    expect(readFileSync(join(dir, FILE), 'utf8')).toBe(before);
  });

  it('reports unknown schema versions', async () => {
    await expect(service().openProject(copy('unknown-version'))).rejects.toBeInstanceOf(
      ProjectOpenError,
    );
    await expect(service().openProject(copy('unknown-version'))).rejects.toMatchObject({
      code: 'unknown-version',
    });
  });

  it('keeps the last valid primary as the backup', async () => {
    const dir = copy('valid-v1');
    const s = service();
    const h = await s.openProject(dir);
    await s.saveProject(h, { ...h.project, name: 'second' });
    expect(read(dir).name).toBe('second');
    expect(read(dir, `${FILE}.bak`).name).toBe(h.project.name);
  });

  it('never rotates a corrupt primary over a good backup', async () => {
    const dir = copy('valid-v1');
    const s = service();
    const h = await s.openProject(dir);
    await s.saveProject(h, { ...h.project, name: 'second' });
    writeFileSync(join(dir, FILE), '{bad');
    await s.saveProject(h, { ...h.project, name: 'third' });
    expect(read(dir, `${FILE}.bak`).name).toBe(h.project.name);
    expect(read(dir).name).toBe('third');
  });

  it.each(['write', 'flush', 'rename'] as const)(
    'keeps the primary when %s fails',
    async (step) => {
      const dir = copy('valid-v1');
      const fs: FileSystemAdapter = {
        ...nodeFileSystem,
        [step]: async () => {
          throw new Error('disk full');
        },
      };
      const before = readFileSync(join(dir, FILE), 'utf8');
      const s = service(fs);
      const h = await service().openProject(dir);
      await expect(s.saveProject(h, { ...h.project, name: 'x' })).rejects.toThrow('disk full');
      expect(readFileSync(join(dir, FILE), 'utf8')).toBe(before);
      expect(readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
    },
  );

  it('refuses to save an invalid project', async () => {
    const dir = copy('valid-v1');
    const s = service();
    const h = await s.openProject(dir);
    await expect(
      s.saveProject(h, { ...h.project, timeline: { ...h.project.timeline, frames: 0 } }),
    ).rejects.toThrow();
    expect(read(dir).timeline.frames).toBe(90);
  });

  it('offers the backup when the primary is corrupt', async () => {
    const dir = copy('valid-v1');
    const s = service();
    const h = await s.openProject(dir);
    await s.saveProject(h, { ...h.project, name: 'second' });
    writeFileSync(join(dir, FILE), '{bad');
    const choice = await s.recoverProject(dir);
    expect(choice).toMatchObject({ kind: 'backup-available', projectName: h.project.name });
    expect(read(dir, `${FILE}.bak`).name).toBe(h.project.name);
    const restored = await s.applyBackup(dir);
    expect(restored.project.name).toBe(h.project.name);
    expect(existsSync(join(dir, `${FILE}.corrupt`))).toBe(true);
  });

  it('reports nothing to recover without a valid backup', async () => {
    expect(await service().recoverProject(copy('corrupt'))).toEqual({ kind: 'unrecoverable' });
    expect(await service().recoverProject(copy('valid-v1'))).toEqual({ kind: 'primary-ok' });
  });

  it('never writes absolute host paths into the project', async () => {
    const h = await service().createProject({ parentDir: tmp(), name: 'p' });
    expect(readFileSync(join(h.path, FILE), 'utf8')).not.toContain(tmpdir());
  });
});

describe('recent projects', () => {
  it('orders, dedupes, caps at 10, and keeps missing entries visible until removed', async () => {
    const s = service();
    const dirs = Array.from({ length: 11 }, () => copy('valid-v1'));
    for (const d of dirs) await s.openProject(d);
    await s.openProject(dirs[5]!);
    let list = await s.listRecentProjects();
    expect(list).toHaveLength(10);
    expect(list[0]!.path).toBe(dirs[5]);
    expect(new Set(list.map((r) => r.path)).size).toBe(10);
    rmSync(dirs[5]!, { recursive: true });
    list = await s.listRecentProjects();
    expect(list[0]).toMatchObject({ path: dirs[5], available: false });
    await s.removeRecentProject(dirs[5]!);
    expect((await s.listRecentProjects()).some((r) => r.path === dirs[5])).toBe(false);
  });

  it('adds an entry only after a successful open', async () => {
    const s = service();
    await s.openProject(copy('corrupt')).catch(() => undefined);
    expect(await s.listRecentProjects()).toEqual([]);
  });
});
