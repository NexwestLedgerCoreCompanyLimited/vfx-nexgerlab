import { strToU8, zipSync } from 'fflate';
import { GamePackManifestSchema, type GamePackFile } from '../../shared/schemas/game-pack-manifest';

const MAX_BYTES = 1024 * 1024 * 1024;

export interface GamePackEntry extends GamePackFile {
  bytes: Uint8Array;
}

export interface GamePackInput {
  name: string;
  metadata: unknown;
  entries: GamePackEntry[];
}

function assertSafe(path: string): void {
  const parts = path.split('/');
  const safe =
    !path.includes('\\') &&
    !path.includes(':') &&
    parts.every((p) => p !== '' && p !== '.' && p !== '..');
  if (!safe) throw new Error(`Unsafe pack path: ${path}`);
}

export function buildGamePack(input: GamePackInput): Uint8Array {
  const zip: Record<string, Uint8Array> = {};
  let total = 0;
  const files: GamePackFile[] = input.entries.map(({ bytes, ...file }) => {
    assertSafe(file.path);
    if (zip[file.path]) throw new Error(`Duplicate pack path: ${file.path}`);
    total += bytes.length;
    if (total > MAX_BYTES) throw new Error('Game pack is too large');
    zip[file.path] = bytes;
    return file;
  });
  const manifest = GamePackManifestSchema.parse({
    schemaVersion: 1,
    app: 'VFX NexgerLab',
    name: input.name,
    metadata: 'metadata.json',
    files,
  });
  zip['manifest.json'] = strToU8(JSON.stringify(manifest, null, 1));
  zip['metadata.json'] = strToU8(JSON.stringify(input.metadata, null, 1));
  return zipSync(zip, { level: 6 });
}
