import { dialog, ipcMain } from 'electron';
import { z } from 'zod';
import { IPC, type ProjectHandle } from '../../shared/contracts/ipc';
import { AssetRefSchema, ProjectSchema } from '../../shared/schemas/project';
import { importAsset, readAssetFrames, removeAsset } from '../services/asset-service';

const Strip = z.strictObject({ frameCount: z.number().int(), fps: z.number().int() }).optional();
const Handle = z.object({
  path: z.string().max(4096),
  project: ProjectSchema,
  missingAssets: z.array(z.string()),
});

export function registerAssetIpc(assertKnown: (path: string) => Promise<void>): void {
  // The renderer never names a source file: main holds the path the user picked.
  let picked: string | undefined;

  ipcMain.handle(IPC.pickAssetFile, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Sprites', extensions: ['png', 'gif'] }],
    });
    picked = result.canceled ? undefined : result.filePaths[0];
    return picked !== undefined;
  });

  ipcMain.handle(IPC.importAsset, async (_e, handle: unknown, strip: unknown) => {
    const parsed = Handle.parse(handle) as ProjectHandle;
    await assertKnown(parsed.path);
    if (!picked) throw new Error('No file picked');
    const ref = await importAsset(parsed, { sourcePath: picked, strip: Strip.parse(strip) });
    picked = undefined;
    return ref;
  });

  ipcMain.handle(IPC.readAssetFrames, async (_e, path: unknown, ref: unknown) => {
    const target = z.string().max(4096).parse(path);
    await assertKnown(target);
    return readAssetFrames(target, AssetRefSchema.parse(ref));
  });

  ipcMain.handle(IPC.removeAsset, async (_e, path: unknown, project: unknown, id: unknown) => {
    const target = z.string().max(4096).parse(path);
    await assertKnown(target);
    await removeAsset(target, ProjectSchema.parse(project), z.uuid().parse(id));
  });
}
