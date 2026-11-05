import { dialog, ipcMain } from 'electron';
import { z } from 'zod';
import { IPC } from '../../shared/contracts/ipc';
import { ProjectSchema } from '../../shared/schemas/project';
import type { createProjectService } from '../services/project-service';

const Path = z.string().min(1).max(4096);
const Name = z.string().trim().min(1).max(120);

/** The renderer can only reach folders the user picked or already has in recents. */
export function registerProjectIpc(service: ReturnType<typeof createProjectService>): void {
  const opened = new Set<string>();

  async function assertKnown(path: string): Promise<void> {
    if (opened.has(path)) return;
    const recent = await service.listRecentProjects();
    if (!recent.some((r) => r.path === path)) throw new Error('Unknown project path');
    opened.add(path);
  }

  ipcMain.handle(IPC.createProject, async (_e, name: unknown) => {
    const picked = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (picked.canceled || !picked.filePaths[0]) return undefined;
    const handle = await service.createProject({
      parentDir: picked.filePaths[0],
      name: Name.parse(name),
    });
    opened.add(handle.path);
    return handle;
  });

  ipcMain.handle(IPC.openProject, async (_e, path: unknown) => {
    let target: string | undefined;
    if (path === undefined) {
      const picked = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      target = picked.filePaths[0];
      if (picked.canceled || !target) return undefined;
    } else {
      target = Path.parse(path);
      await assertKnown(target);
    }
    opened.add(target);
    return service.openProject(target);
  });

  ipcMain.handle(IPC.saveProject, async (_e, path: unknown, project: unknown) => {
    const target = Path.parse(path);
    await assertKnown(target);
    await service.saveProject({ path: target }, ProjectSchema.parse(project));
  });

  ipcMain.handle(IPC.recoverProject, async (_e, path: unknown) => {
    const target = Path.parse(path);
    await assertKnown(target);
    return service.recoverProject(target);
  });

  ipcMain.handle(IPC.applyBackup, async (_e, path: unknown) => {
    const target = Path.parse(path);
    await assertKnown(target);
    return service.applyBackup(target);
  });

  ipcMain.handle(IPC.listRecentProjects, () => service.listRecentProjects());
  ipcMain.handle(IPC.removeRecentProject, (_e, path: unknown) =>
    service.removeRecentProject(Path.parse(path)),
  );
}
