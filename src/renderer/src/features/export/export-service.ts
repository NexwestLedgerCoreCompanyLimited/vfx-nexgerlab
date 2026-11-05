import { resolveDirectionProject } from '../../../../engine/directions';
import { encodeApng } from '../../../../engine/exporters/apng';
import { encodeAseprite } from '../../../../engine/exporters/aseprite';
import { encodeBmp } from '../../../../engine/exporters/bmp';
import { buildGamePack, type GamePackEntry } from '../../../../engine/exporters/game-pack';
import { encodeGif } from '../../../../engine/exporters/gif';
import { buildExportMetadata } from '../../../../engine/exporters/metadata';
import { encodePng } from '../../../../engine/exporters/png';
import {
  calculateSheetLayout,
  packSheet,
  type SheetLayout,
} from '../../../../engine/exporters/spritesheet';
import { encodeTga } from '../../../../engine/exporters/tga';
import { assembleAnimatedWebp } from '../../../../engine/exporters/webp';
import { generateNormalMap } from '../../../../engine/normal-map';
import { exportFrameCount } from '../../../../engine/project-factory';
import type { FrameRGBA, RenderOptions } from '../../../../engine/render-types';
import {
  DIRECTION_ORDER,
  type Direction,
  type DirectionCount,
} from '../../../../shared/directions';
import type { ProjectV1 } from '../../../../shared/schemas/project';
import type { RenderClient } from '../../engine/render-client';
import { encodeWithCanvas } from '../assets/decode-image';

export type ExportFormat =
  | 'spritesheet-json'
  | 'png-sequence'
  | 'gif'
  | 'apng'
  | 'webp'
  | 'aseprite'
  | 'bmp-sequence'
  | 'tga-sequence'
  | 'jpeg-sequence'
  | 'game-pack';

export interface ExportSettings {
  format: ExportFormat;
  directions: DirectionCount;
  split: boolean;
  includeAct: boolean;
  normal: boolean;
  normalStrength: number;
  name: string;
}

const MAX_SHEET_SIDE = 16384;
const MAX_TOTAL_PIXELS = 400_000_000; // 1.6 GB of RGBA held while packing
const WHOLE: RenderOptions = { partFilter: 'whole', includeStage: false };

export class ExportTooLargeError extends Error {}

export interface ExportFile {
  path: string;
  bytes: Uint8Array;
}

export function exportSize(project: ProjectV1, settings: Pick<ExportSettings, 'directions'>) {
  const order = DIRECTION_ORDER[settings.directions];
  const frames = exportFrameCount(project);
  const canvas = resolveDirectionProject(project, order[0], settings.directions).canvas;
  return { order, frames, width: canvas.width, height: canvas.height };
}

export async function renderDirection(
  client: RenderClient,
  project: ProjectV1,
  frames: number,
  options: RenderOptions,
  signal: AbortSignal,
  tick: () => void,
): Promise<FrameRGBA[]> {
  const list: FrameRGBA[] = [];
  const request = { project, frames: Array.from({ length: frames }, (_, i) => i), options };
  for await (const frame of client.renderSequence(request, tick, signal)) list.push(frame);
  return list;
}

const SEQUENCES: Partial<
  Record<
    ExportFormat,
    { extension: string; encode(f: FrameRGBA): Uint8Array | Promise<Uint8Array> }
  >
> = {
  'bmp-sequence': { extension: 'bmp', encode: encodeBmp },
  'tga-sequence': { extension: 'tga', encode: encodeTga },
  'jpeg-sequence': { extension: 'jpg', encode: (f) => encodeWithCanvas(f, 'image/jpeg') },
};

const padded = (i: number) => String(i + 1).padStart(4, '0');

async function* buildFiles(
  client: RenderClient,
  project: ProjectV1,
  settings: ExportSettings,
  signal: AbortSignal,
  tick: () => void,
): AsyncGenerator<ExportFile> {
  const { order, frames, width, height } = exportSize(project, settings);
  const { name, directions, format } = settings;
  const layoutFor = (dirs: readonly Direction[]) =>
    calculateSheetLayout({ frameWidth: width, frameHeight: height, frames, directions: dirs });
  const layout = layoutFor(order);
  if (
    layout.width > MAX_SHEET_SIDE ||
    layout.height > MAX_SHEET_SIDE ||
    layout.width * layout.height > MAX_TOTAL_PIXELS
  ) {
    throw new ExportTooLargeError();
  }
  const durations = Array.from({ length: frames }, () => Math.round(1000 / project.timeline.fps));
  const metadata = buildExportMetadata({
    project,
    layout,
    image: `${name}.png`,
    includeAct: settings.includeAct,
  });
  const json = new TextEncoder().encode(JSON.stringify(metadata, null, 1));
  const view = (direction: Direction) => resolveDirectionProject(project, direction, directions);
  const render = (direction: Direction, options: RenderOptions = WHOLE) =>
    renderDirection(client, view(direction), frames, options, signal, tick);
  const normals = (list: FrameRGBA[]) =>
    list.map((f) => generateNormalMap(f, { strength: settings.normalStrength }));
  const sheet = (l: SheetLayout, list: FrameRGBA[]) => encodePng(packSheet(l, list));

  if (format === 'gif' || format === 'apng') {
    for (const direction of order) {
      const list = await render(direction);
      if (signal.aborted) return;
      const suffix = order.length > 1 ? `-${direction}` : '';
      yield format === 'gif'
        ? { path: `${name}${suffix}.gif`, bytes: encodeGif(list, durations, project.timeline.loop) }
        : {
            path: `${name}${suffix}.png`,
            bytes: encodeApng(list, durations, project.timeline.loop),
          };
    }
    return;
  }

  if (format === 'webp' || format === 'aseprite') {
    for (const direction of order) {
      const list = await render(direction);
      if (signal.aborted) return;
      const suffix = order.length > 1 ? `-${direction}` : '';
      if (format === 'aseprite') {
        yield { path: `${name}${suffix}.aseprite`, bytes: encodeAseprite(list, durations) };
      } else {
        const stills = await Promise.all(list.map((f) => encodeWithCanvas(f, 'image/webp')));
        yield {
          path: `${name}${suffix}.webp`,
          bytes: assembleAnimatedWebp(stills, durations, width, height, project.timeline.loop),
        };
      }
    }
    return;
  }

  const sequence = SEQUENCES[format];
  if (sequence) {
    for (const direction of order) {
      const list = await render(direction);
      if (signal.aborted) return;
      for (let i = 0; i < list.length; i++) {
        yield {
          path: `${name}/${direction}/${padded(i)}.${sequence.extension}`,
          bytes: await sequence.encode(list[i]!),
        };
      }
    }
    return;
  }

  if (format === 'png-sequence') {
    for (const direction of order) {
      const list = await render(direction);
      if (signal.aborted) return;
      for (let i = 0; i < list.length; i++) {
        yield { path: `${name}/${direction}/${padded(i)}.png`, bytes: encodePng(list[i]!) };
        if (settings.normal) {
          yield {
            path: `${name}/normals/${direction}/${padded(i)}.png`,
            bytes: encodePng(generateNormalMap(list[i]!, { strength: settings.normalStrength })),
          };
        }
      }
    }
    yield { path: `${name}/${name}.json`, bytes: json };
    return;
  }

  const collect = async (options: RenderOptions) => {
    const all: FrameRGBA[] = [];
    for (const direction of order) all.push(...(await render(direction, options)));
    return all;
  };

  if (format === 'spritesheet-json') {
    const whole = await collect(WHOLE);
    if (signal.aborted) return;
    yield { path: `${name}.png`, bytes: sheet(layout, whole) };
    yield { path: `${name}.json`, bytes: json };
    if (settings.normal) yield { path: `${name}-normal.png`, bytes: sheet(layout, normals(whole)) };
    if (settings.split) {
      for (const part of ['behind', 'front'] as const) {
        const list = await collect({ partFilter: part, includeStage: false });
        if (signal.aborted) return;
        yield { path: `${name}-${part}.png`, bytes: sheet(layout, list) };
      }
    }
    return;
  }

  const entries: GamePackEntry[] = [];
  const add = (file: Omit<GamePackEntry, 'bytes'>, l: SheetLayout, list: FrameRGBA[]) => {
    entries.push({ ...file, bytes: sheet(l, list) });
    if (settings.normal) {
      entries.push({
        path: `normals/${file.path}`,
        kind: 'normal',
        bytes: sheet(l, normals(list)),
      });
    }
  };
  add({ path: 'whole/sheet.png', kind: 'whole' }, layout, await collect(WHOLE));
  add(
    { path: 'behind-sprite/sheet.png', kind: 'behind' },
    layout,
    await collect({ partFilter: 'behind', includeStage: false }),
  );
  add(
    { path: 'in-front-sprite/sheet.png', kind: 'front' },
    layout,
    await collect({ partFilter: 'front', includeStage: false }),
  );
  for (const layer of project.layers) {
    const list = await collect({ partFilter: { layerId: layer.id }, includeStage: false });
    add({ path: `parts/${layer.id}/sheet.png`, kind: 'part', part: layer.id }, layout, list);
  }
  for (const direction of order) {
    const list = await render(direction);
    add(
      { path: `directions/${direction}/sheet.png`, kind: 'direction', direction },
      layoutFor([direction]),
      list,
    );
  }
  if (signal.aborted) return;
  yield { path: `${name}.zip`, bytes: buildGamePack({ name, metadata, entries }) };
}

function passes(project: ProjectV1, settings: ExportSettings): number {
  if (settings.format === 'game-pack') return project.layers.length + 4;
  return settings.format === 'spritesheet-json' && settings.split ? 3 : 1;
}

export type ExportResult = { status: 'done'; files: string[] } | { status: 'cancelled' };

export async function runExport(
  client: RenderClient,
  project: ProjectV1,
  settings: ExportSettings,
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
  confirmOverwrite: (files: string[]) => boolean,
): Promise<ExportResult> {
  const session = await window.vfxlab.exportBegin();
  if (!session) return { status: 'cancelled' };
  const { order, frames } = exportSize(project, settings);
  const total = order.length * frames * passes(project, settings);
  let done = 0;
  try {
    const name = await window.vfxlab.exportName(settings.name);
    for await (const file of buildFiles(client, project, { ...settings, name }, signal, () =>
      onProgress(++done, total),
    )) {
      await window.vfxlab.exportWrite(session, file.path, file.bytes);
    }
    if (signal.aborted) {
      await window.vfxlab.exportAbort(session);
      return { status: 'cancelled' };
    }
    let result = await window.vfxlab.exportCommit(session, false);
    if (result.status === 'exists') {
      if (!confirmOverwrite(result.files)) {
        await window.vfxlab.exportAbort(session);
        return { status: 'cancelled' };
      }
      result = await window.vfxlab.exportCommit(session, true);
    }
    return { status: 'done', files: result.files };
  } catch (error) {
    await window.vfxlab.exportAbort(session);
    throw error;
  }
}
