export interface SaveFile {
  path: string;
  bytes: Uint8Array;
}

/** Writes a set of files through the safe export session. Returns how many landed, or 0 if cancelled. */
export async function saveFiles(
  files: SaveFile[],
  confirmOverwrite: (count: number) => boolean,
): Promise<number> {
  const session = await window.vfxlab.exportBegin();
  if (!session) return 0;
  try {
    for (const file of files) await window.vfxlab.exportWrite(session, file.path, file.bytes);
    let result = await window.vfxlab.exportCommit(session, false);
    if (result.status === 'exists') {
      if (!confirmOverwrite(result.files.length)) {
        await window.vfxlab.exportAbort(session);
        return 0;
      }
      result = await window.vfxlab.exportCommit(session, true);
    }
    return result.files.length;
  } catch (error) {
    await window.vfxlab.exportAbort(session);
    throw error;
  }
}
