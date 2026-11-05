import { randomUUID } from 'node:crypto';
import { access, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

export function safeExportName(name: string): string {
  const clean = name
    // oxlint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
  return clean || 'effect';
}

function assertRelative(path: string): void {
  const parts = path.split('/');
  const safe =
    path !== '' &&
    !path.includes('\\') &&
    !path.includes(':') &&
    parts.every((p) => p !== '' && p !== '.' && p !== '..');
  if (!safe) throw new Error(`Unsafe export path: ${path}`);
}

async function listFiles(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push(relative(base, full).split('\\').join('/'));
  }
  return out;
}

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

/** Files build up in a hidden temp folder, so a cancel or failure leaves the target untouched. */
export async function createExportSession(target: string) {
  const temp = join(target, `.vfxlab-export-${randomUUID()}`);
  await mkdir(temp);
  return {
    async write(path: string, bytes: Uint8Array): Promise<void> {
      assertRelative(path);
      const file = join(temp, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, bytes);
    },
    async commit(overwrite: boolean): Promise<{ status: 'ok' | 'exists'; files: string[] }> {
      const files = (await listFiles(temp)).sort();
      if (!overwrite) {
        for (const file of files) {
          if (await exists(join(target, file))) return { status: 'exists', files };
        }
      }
      for (const file of files) {
        await mkdir(dirname(join(target, file)), { recursive: true });
        await rename(join(temp, file), join(target, file));
      }
      await rm(temp, { recursive: true, force: true });
      return { status: 'ok', files };
    },
    abort: () => rm(temp, { recursive: true, force: true }),
  };
}
