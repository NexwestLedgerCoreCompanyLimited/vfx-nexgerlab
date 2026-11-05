import { resolveDirectionProject } from '../../../../engine/directions';
import { buildExportMetadata } from '../../../../engine/exporters/metadata';
import { encodePng } from '../../../../engine/exporters/png';
import { calculateSheetLayout, packSheet } from '../../../../engine/exporters/spritesheet';
import { exportFrameCount } from '../../../../engine/project-factory';
import type { FrameRGBA, RenderOptions } from '../../../../engine/render-types';
import { DIRECTION_ORDER, type DirectionCount } from '../../../../shared/directions';
import type { ProjectV1 } from '../../../../shared/schemas/project';
import type { RenderClient } from '../../engine/render-client';

export type ExportFormat = 'spritesheet-json' | 'png-sequence';

export interface ExportSettings {
  format: ExportFormat;
  directions: DirectionCount;
  split: boolean;
  includeAct: boolean;
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

export function exportSize(project: ProjectV1, settings: ExportSettings) {
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

const padded = (i: number) => String(i + 1).padStart(4, '0');

async function* buildFiles(
  client: RenderClient,
  project: ProjectV1,
  settings: ExportSettings,
  signal: AbortSignal,
  tick: () => void,
): AsyncGenerator<ExportFile> {
  const { order, frames, width, height } = exportSize(project, settings);
  const { name, directions } = settings;
  const layout = calculateSheetLayout({
    frameWidth: width,
    frameHeight: height,
    frames,
    directions: order,
  });
  if (
    layout.width > MAX_SHEET_SIDE ||
    layout.height > MAX_SHEET_SIDE ||
    layout.width * layout.height > MAX_TOTAL_PIXELS
  ) {
    throw new ExportTooLargeError();
  }
  const all: FrameRGBA[] = [];
  for (const direction of order) {
    const view = resolveDirectionProject(project, direction, directions);
    const rendered = await renderDirection(client, view, frames, WHOLE, signal, tick);
    if (signal.aborted) return;
    if (settings.format === 'png-sequence') {
      for (let i = 0; i < rendered.length; i++) {
        yield { path: `${name}/${direction}/${padded(i)}.png`, bytes: encodePng(rendered[i]!) };
      }
    }
    all.push(...rendered);
  }
  const metadata = buildExportMetadata({
    project,
    layout,
    image: `${name}.png`,
    includeAct: settings.includeAct,
  });
  const json = new TextEncoder().encode(JSON.stringify(metadata, null, 1));
  if (settings.format === 'png-sequence') {
    yield { path: `${name}/${name}.json`, bytes: json };
    return;
  }
  yield { path: `${name}.png`, bytes: encodePng(packSheet(layout, all)) };
  yield { path: `${name}.json`, bytes: json };
  if (settings.split) {
    for (const part of ['behind', 'front'] as const) {
      const options: RenderOptions = { partFilter: part, includeStage: false };
      const parts: FrameRGBA[] = [];
      for (const direction of order) {
        parts.push(
          ...(await renderDirection(
            client,
            resolveDirectionProject(project, direction, directions),
            frames,
            options,
            signal,
            tick,
          )),
        );
      }
      if (signal.aborted) return;
      yield { path: `${name}-${part}.png`, bytes: encodePng(packSheet(layout, parts)) };
    }
  }
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
  const total =
    order.length * frames * (settings.split && settings.format === 'spritesheet-json' ? 3 : 1);
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
