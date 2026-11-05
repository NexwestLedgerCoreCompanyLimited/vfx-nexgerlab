import { createHash } from 'node:crypto';
import { access, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js';
import { PNG } from 'pngjs';
import type { ProjectHandle } from '../../shared/contracts/ipc';
import type { AssetFrame, StripLayout } from '../../shared/models/asset';
import {
  AssetRefSchema,
  MAX_FRAMES,
  type AssetRef,
  type ProjectV1,
} from '../../shared/schemas/project';
import { newId } from '../../shared/utils/id';

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_SIDE = 4096;
const MAX_TOTAL_PIXELS = 64_000_000; // 256 MB of RGBA once decoded
const DEFAULT_DURATION_MS = 100;

export type AssetErrorCode =
  'missing' | 'too-large' | 'unsupported' | 'corrupt' | 'bad-strip' | 'in-use';

export class AssetError extends Error {
  constructor(readonly code: AssetErrorCode) {
    super(`Asset error: ${code}`);
  }
}

export interface ImportAssetInput {
  sourcePath: string;
  strip?: StripLayout;
}

const isPng = (b: Buffer) =>
  b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
const isGif = (b: Buffer) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1'));

function assertSide(width: number, height: number): void {
  if (width > MAX_SIDE || height > MAX_SIDE) throw new AssetError('too-large');
}

function decodePng(bytes: Buffer): { width: number; height: number; data: Uint8Array } {
  if (bytes.length < 24) throw new AssetError('corrupt');
  assertSide(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
  try {
    return PNG.sync.read(bytes);
  } catch {
    throw new AssetError('corrupt');
  }
}

function pngFrames(bytes: Buffer, strip?: StripLayout): AssetFrame[] {
  const png = decodePng(bytes);
  if (!strip) {
    return [
      {
        width: png.width,
        height: png.height,
        rgba: new Uint8ClampedArray(png.data),
        durationMs: DEFAULT_DURATION_MS,
      },
    ];
  }
  const { frameCount, fps } = strip;
  if (
    !Number.isInteger(frameCount) ||
    frameCount < 1 ||
    frameCount > MAX_FRAMES ||
    !Number.isInteger(fps) ||
    fps < 1 ||
    fps > 60 ||
    png.width % frameCount !== 0
  ) {
    throw new AssetError('bad-strip');
  }
  const width = png.width / frameCount;
  return Array.from({ length: frameCount }, (_, f) => {
    const rgba = new Uint8ClampedArray(width * png.height * 4);
    for (let y = 0; y < png.height; y++) {
      const from = (y * png.width + f * width) * 4;
      rgba.set(png.data.subarray(from, from + width * 4), y * width * 4);
    }
    return { width, height: png.height, rgba, durationMs: Math.round(1000 / fps) };
  });
}

function gifFrames(bytes: Buffer): AssetFrame[] {
  if (bytes.length < 13) throw new AssetError('corrupt');
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  assertSide(width, height);
  if (width === 0 || height === 0) throw new AssetError('corrupt');
  let parts: ParsedFrame[];
  try {
    const gif = parseGIF(new Uint8Array(bytes).buffer);
    // frames carry their own size, and the decoder allocates from it, not from the screen
    const images = gif.frames.flatMap((f) => ('image' in f ? [f.image.descriptor] : []));
    const pixels = images.reduce((sum, d) => sum + d.width * d.height, 0);
    if (
      images.length > MAX_FRAMES ||
      images.length * width * height > MAX_TOTAL_PIXELS ||
      pixels > MAX_TOTAL_PIXELS ||
      images.some((d) => d.width > width || d.height > height)
    )
      throw new AssetError('too-large');
    parts = decompressFrames(gif, true) as ParsedFrame[];
  } catch (error) {
    throw error instanceof AssetError ? error : new AssetError('corrupt');
  }
  if (parts.length === 0) throw new AssetError('corrupt');

  const canvas = new Uint8ClampedArray(width * height * 4);
  return parts.map((part) => {
    const { top, left, width: pw, height: ph } = part.dims;
    if (part.patch.length !== pw * ph * 4) throw new AssetError('corrupt');
    const before = part.disposalType === 3 ? canvas.slice() : undefined;
    for (let y = 0; y < ph && y + top < height; y++) {
      for (let x = 0; x < pw && x + left < width; x++) {
        const from = (y * pw + x) * 4;
        if (part.patch[from + 3] === 0) continue;
        canvas.set(part.patch.subarray(from, from + 4), ((y + top) * width + x + left) * 4);
      }
    }
    const frame = {
      width,
      height,
      rgba: canvas.slice(),
      durationMs: part.delay || DEFAULT_DURATION_MS,
    };
    if (before) canvas.set(before);
    else if (part.disposalType === 2) {
      for (let y = top; y < top + ph && y < height; y++) {
        canvas.fill(0, (y * width + left) * 4, (y * width + Math.min(left + pw, width)) * 4);
      }
    }
    return frame;
  });
}

function decode(
  bytes: Buffer,
  strip?: StripLayout,
): { kind: AssetRef['kind']; frames: AssetFrame[] } {
  if (isPng(bytes))
    return { kind: strip ? 'sprite-strip' : 'png', frames: pngFrames(bytes, strip) };
  if (isGif(bytes)) {
    if (strip) throw new AssetError('bad-strip');
    return { kind: 'gif', frames: gifFrames(bytes) };
  }
  throw new AssetError('unsupported');
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

export async function readSource(path: string): Promise<Buffer> {
  const size = await stat(path).then(
    (s) => s.size,
    () => {
      throw new AssetError('missing');
    },
  );
  if (size > MAX_BYTES) throw new AssetError('too-large');
  return readFile(path);
}

export async function importAssetBytes(
  handle: ProjectHandle,
  input: { bytes: Buffer; originalName: string; strip?: StripLayout | undefined },
): Promise<AssetRef> {
  const { bytes, originalName, strip } = input;
  if (bytes.length > MAX_BYTES) throw new AssetError('too-large');
  const { kind, frames } = decode(bytes, strip);
  const hash = sha256(bytes);
  const existing = handle.project.assets.find((a) => a.hash === hash && a.kind === kind);
  if (existing) return existing;
  const path = `assets/${hash}.${isPng(bytes) ? 'png' : 'gif'}`;
  const target = join(handle.path, path);
  if (
    !(await access(target).then(
      () => true,
      () => false,
    ))
  )
    await writeFile(target, bytes);
  const first = frames[0]!;
  return AssetRefSchema.parse({
    id: newId(),
    originalName: basename(originalName).slice(0, 255),
    hash,
    kind,
    path,
    width: first.width,
    height: first.height,
    frameCount: frames.length,
    ...(strip ? { fps: strip.fps } : {}),
  });
}

export async function importAsset(
  handle: ProjectHandle,
  input: ImportAssetInput,
): Promise<AssetRef> {
  const bytes = await readSource(input.sourcePath);
  return importAssetBytes(handle, {
    bytes,
    originalName: basename(input.sourcePath),
    strip: input.strip,
  });
}

export async function readAssetFrames(projectPath: string, ref: AssetRef): Promise<AssetFrame[]> {
  const bytes = await readFile(join(projectPath, ref.path)).catch(() => {
    throw new AssetError('missing');
  });
  if (sha256(bytes) !== ref.hash) throw new AssetError('corrupt');
  const strip =
    ref.kind === 'sprite-strip' ? { frameCount: ref.frameCount, fps: ref.fps ?? 12 } : undefined;
  return decode(bytes, strip).frames;
}

export async function removeAsset(
  projectPath: string,
  project: ProjectV1,
  assetId: string,
): Promise<void> {
  const uses = (list: ProjectV1['spriteAttachments']) => list.some((a) => a.assetId === assetId);
  const character = (list: ProjectV1['layers']) => list.some((l) => l.actorAssetId === assetId);
  if (
    uses(project.spriteAttachments) ||
    project.versions.some((v) => uses(v.spriteAttachments)) ||
    character(project.layers) ||
    project.versions.some((v) => character(v.layers))
  ) {
    throw new AssetError('in-use');
  }
  const ref = project.assets.find((a) => a.id === assetId);
  if (!ref) throw new AssetError('missing');
  const shared = project.assets.some((a) => a.id !== assetId && a.path === ref.path);
  if (!shared) await unlink(join(projectPath, ref.path));
}
