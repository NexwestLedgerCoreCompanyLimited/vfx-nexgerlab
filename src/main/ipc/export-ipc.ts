import { randomUUID } from 'node:crypto';
import { dialog, ipcMain } from 'electron';
import { z } from 'zod';
import { IPC } from '../../shared/contracts/ipc';
import { createExportSession, safeExportName } from '../services/export-service';

type Session = Awaited<ReturnType<typeof createExportSession>>;

export function registerExportIpc(): void {
  const sessions = new Map<string, Session>();
  const get = (id: unknown): Session => {
    const session = sessions.get(z.string().parse(id));
    if (!session) throw new Error('Unknown export session');
    return session;
  };

  ipcMain.handle(IPC.exportBegin, async () => {
    const picked = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    const target = picked.filePaths[0];
    if (picked.canceled || !target) return undefined;
    const id = randomUUID();
    sessions.set(id, await createExportSession(target));
    return id;
  });
  ipcMain.handle(IPC.exportWrite, (_e, id: unknown, path: unknown, bytes: unknown) => {
    if (!(bytes instanceof Uint8Array)) throw new Error('Expected bytes');
    return get(id).write(z.string().max(512).parse(path), bytes);
  });
  ipcMain.handle(IPC.exportCommit, async (_e, id: unknown, overwrite: unknown) => {
    const result = await get(id).commit(z.boolean().parse(overwrite));
    if (result.status === 'ok') sessions.delete(z.string().parse(id));
    return result;
  });
  ipcMain.handle(IPC.exportAbort, async (_e, id: unknown) => {
    await get(id).abort();
    sessions.delete(z.string().parse(id));
  });
  ipcMain.handle(IPC.exportName, (_e, name: unknown) =>
    safeExportName(z.string().max(120).parse(name)),
  );
}
