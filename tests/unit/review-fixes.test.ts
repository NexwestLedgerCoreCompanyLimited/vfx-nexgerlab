import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import allowlist from '../../src/engine/actor-allowlist.json';
import { spriteToActor } from '../../src/engine/actor-adapter';
import { resolveDirectionProject, setDirectionCount } from '../../src/engine/directions';
import { validateEffectOptions } from '../../src/engine/effect-registry';
import { buildExportMetadata } from '../../src/engine/exporters/metadata';
import { calculateSheetLayout } from '../../src/engine/exporters/spritesheet';
import { createLayerCursor } from '../../src/engine/layer-cursor';
import { hashPixels } from '../../src/engine/frame-hash';
import {
  createEffectLayer,
  createProjectFromEffect,
  exportFrameCount,
  missingAssetIds,
} from '../../src/engine/project-factory';
import { createRenderCache, renderProjectFrame } from '../../src/engine/render-model';
import { resolveAttachmentFrame } from '../../src/engine/sprite-attachment';
import { clearFrame, composite, createFrame } from '../../src/engine/pixelfx/src/core/index.js';
import { AssetError, importAssetBytes } from '../../src/main/services/asset-service';
import { nodeFileSystem } from '../../src/main/services/file-system-adapter';
import { ProjectOpenError, createProjectService } from '../../src/main/services/project-service';
import { useEditor } from '../../src/renderer/src/features/editor/use-editor-store';
import { saveCurrent } from '../../src/renderer/src/features/editor/use-save';
import { exportTooLarge } from '../../src/renderer/src/features/export/export-limits';
import { createRenderClient } from '../../src/renderer/src/engine/render-client';
import { newProject } from '../../src/shared/models/new-project';
import { ProjectSchema, type ProjectV1 } from '../../src/shared/schemas/project';

const dir = () => mkdtempSync(join(tmpdir(), 'vfxlab-fix-'));
const sprite = (w: number, h: number, fill: (x: number, y: number) => boolean) => {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (fill(x, y)) rgba.set([255, 40, 40, 255], (y * w + x) * 4);
  return { width: w, height: h, rgba, durationMs: 100 };
};
const tall = sprite(10, 40, () => true);
const wide = sprite(40, 10, (x) => x % 2 === 0);
const actorOf = (s: typeof tall) => spriteToActor(s, { x: s.width / 2, y: s.height });

function cursorPixels(effectId: string, actor: ReturnType<typeof actorOf>) {
  const layer = createEffectLayer(effectId, 64, 100);
  const cursor = createLayerCursor(layer, 30, false, actor);
  cursor.seek(6);
  const frame = createFrame(128, 128);
  cursor.draw(clearFrame(frame), 'whole');
  const out = new Uint8ClampedArray(128 * 128 * 4);
  composite(frame, out, null);
  return hashPixels(out);
}

describe('custom character', () => {
  it('changes the pixels of effects that read the body', () => {
    const differing = (allowlist as string[]).slice(0, 30).filter((id) => {
      try {
        return cursorPixels(id, actorOf(tall)) !== cursorPixels(id, actorOf(wide));
      } catch {
        return false;
      }
    });
    expect(differing.length).toBeGreaterThan(0);
  });

  it('rebuilds a cached cursor once its sprite has loaded', () => {
    const id = (allowlist as string[]).find((e) => {
      try {
        return cursorPixels(e, actorOf(tall)) !== cursorPixels(e, actorOf(wide));
      } catch {
        return false;
      }
    })!;
    const project = createProjectFromEffect(id, { name: 'x', language: 'en' });
    const assetId = '11111111-1111-4111-8111-111111111111';
    const withActor: ProjectV1 = {
      ...project,
      layers: [{ ...project.layers[0]!, actorAssetId: assetId }],
    };
    const options = { partFilter: 'whole', includeStage: false } as const;
    const cache = createRenderCache();
    const before = hashPixels(
      renderProjectFrame(withActor, 6, new Map(), options, cache).frame.pixels,
    );
    const after = hashPixels(
      renderProjectFrame(withActor, 6, new Map([[assetId, [tall]]]), options, cache).frame.pixels,
    );
    expect(after).not.toBe(before);
  });
});

describe('export length', () => {
  it('follows the timeline when there are no layers', () => {
    const p = newProject('x');
    const q = { ...p, timeline: { ...p.timeline, frames: 60 } };
    expect(exportFrameCount(q)).toBe(60);
  });

  it('follows a timeline the user lengthened', () => {
    const p = createProjectFromEffect('fire/brazier', { name: 'x', language: 'en' });
    expect(exportFrameCount({ ...p, timeline: { ...p.timeline, frames: 150 } })).toBe(150);
  });
});

it('refuses option values far outside the effect range', () => {
  expect(validateEffectOptions('fire/fire-ring', { reach: 1_000_000 }).ok).toBe(false);
  expect(validateEffectOptions('fire/campfire', { height: 1_000_000 }).ok).toBe(false);
});

describe('directional exports', () => {
  const base = setDirectionCount(
    createProjectFromEffect('fire/fireball', { name: 'x', language: 'en' }),
    8,
  );

  it('reports the pivot the frames were drawn with', () => {
    const view = resolveDirectionProject(base, 'S', 8);
    const layout = calculateSheetLayout({
      frameWidth: view.canvas.width,
      frameHeight: view.canvas.height,
      frames: 3,
      directions: ['S'],
    });
    const data = buildExportMetadata({
      project: base,
      directionCount: 8,
      layout,
      image: 'a.png',
      includeAct: false,
    });
    expect(data.meta.vfxlab.pivot).toEqual([view.layers[0]!.x, view.layers[0]!.y]);
  });

  it('moves sprite anchors with the layers', () => {
    const attachment = {
      id: '22222222-2222-4222-8222-222222222222',
      assetId: '11111111-1111-4111-8111-111111111111',
      outputToSourceFrames: [0],
      frameAnchors: [{ sourceFrameIndex: 0, pivot: { x: 0, y: 0 }, anchor: { x: 5, y: 7 } }],
      behindPartIds: [],
      inFrontPartIds: [],
    };
    const view = resolveDirectionProject({ ...base, spriteAttachments: [attachment] }, 'S', 8);
    const dx = view.layers[0]!.x - base.layers[0]!.x;
    const dy = view.layers[0]!.y - base.layers[0]!.y;
    expect(dx).not.toBe(0);
    expect(view.spriteAttachments[0]!.frameAnchors[0]!.anchor).toEqual({ x: 5 + dx, y: 7 + dy });
  });
});

it('keeps a sprite on screen after the timeline grows', () => {
  const attachment = {
    id: '22222222-2222-4222-8222-222222222222',
    assetId: '11111111-1111-4111-8111-111111111111',
    outputToSourceFrames: [0, 1],
    frameAnchors: [],
    behindPartIds: [],
    inFrontPartIds: [],
  };
  expect(resolveAttachmentFrame(attachment, 5).sourceFrameIndex).toBe(1);
});

it('names assets a project uses but could not load', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const p = createProjectFromEffect('fire/fireball', { name: 'x', language: 'en' });
  const used = { ...p, layers: [{ ...p.layers[0]!, actorAssetId: id }] };
  expect(missingAssetIds(used, new Set())).toEqual([id]);
  expect(missingAssetIds(used, new Set([id]))).toEqual([]);
});

function gifWithHugeFrame(): Buffer {
  const le = (n: number) => [n & 255, n >> 8];
  return Buffer.from([
    ...Buffer.from('GIF89a'),
    ...le(1),
    ...le(1),
    0x80,
    0,
    0,
    0,
    0,
    0,
    255,
    255,
    255,
    0x2c,
    0,
    0,
    0,
    0,
    ...le(8000),
    ...le(8000),
    0,
    8,
    2,
    0x4c,
    0x01,
    0,
    0x3b,
  ]);
}

it('refuses a GIF frame larger than its own screen', async () => {
  const path = dir();
  const handle = { path, project: newProject('x'), missingAssets: [] };
  await expect(
    importAssetBytes(handle, { bytes: gifWithHugeFrame(), originalName: 'a.gif' }),
  ).rejects.toThrow(AssetError);
});

describe('project files', () => {
  it('treats an oversized project file as corrupt without parsing it', async () => {
    const path = dir();
    writeFileSync(join(path, 'project.vfxlab.json'), Buffer.alloc(33 * 1024 * 1024, 32));
    const service = createProjectService({ fs: nodeFileSystem, recentFile: join(path, 'r.json') });
    await expect(service.openProject(path)).rejects.toThrow(ProjectOpenError);
  });

  it('limits layers in versions and presets', () => {
    const p = createProjectFromEffect('fire/fireball', { name: 'x', language: 'en' });
    const many = Array.from({ length: 65 }, () => p.layers[0]!);
    const broken = { ...p, versions: [{ ...p.versions[0]!, layers: many }] };
    expect(ProjectSchema.safeParse(broken).success).toBe(false);
  });

  it('numbers a new project folder when the name is taken', async () => {
    const parentDir = dir();
    const service = createProjectService({
      fs: nodeFileSystem,
      recentFile: join(parentDir, 'r.json'),
    });
    const first = await service.createProject({ parentDir, name: 'Fireball' });
    const second = await service.createProject({ parentDir, name: 'Fireball' });
    expect(second.path).not.toBe(first.path);
    expect(existsSync(join(second.path, 'project.vfxlab.json'))).toBe(true);
  });
});

describe('render client', () => {
  const project = newProject('x');
  const options = { partFilter: 'whole', includeStage: false } as const;
  const frame = { width: 1, height: 1, pixels: new Uint8ClampedArray(4) };
  const sequence = (client: ReturnType<typeof createRenderClient>) =>
    (async () => {
      const list = [];
      for await (const f of client.renderSequence(
        { project, frames: [0], options },
        () => {},
        new AbortController().signal,
      ))
        list.push(f);
      return list;
    })();

  function fakeWorker(
    reply: (worker: { onmessage: (e: unknown) => void; onerror: () => void }, id: number) => void,
  ) {
    const worker = {
      onmessage: (_e: unknown) => {},
      onerror: () => {},
      postMessage(message: { id: number }) {
        queueMicrotask(() => reply(worker, message.id));
      },
      terminate() {},
    };
    return worker as unknown as Worker;
  }

  it('fails a sequence when a layer failed', async () => {
    const client = createRenderClient(
      fakeWorker((w, id) =>
        w.onmessage({ data: { id, frame, errors: [{ layerId: 'a', message: 'boom' }] } }),
      ),
    );
    await expect(sequence(client)).rejects.toThrow('boom');
  });

  it('fails a sequence when the worker reports a crash', async () => {
    const client = createRenderClient(
      fakeWorker((w, id) => w.onmessage({ data: { id, failure: 'oom' } })),
    );
    await expect(sequence(client)).rejects.toThrow('oom');
  });

  it('does not hang when the worker dies', async () => {
    const client = createRenderClient(fakeWorker((w) => w.onerror()));
    await expect(sequence(client)).rejects.toThrow();
  });
});

describe('editor save', () => {
  beforeEach(() => useEditor.getState().reset());

  it('stays dirty when an edit lands during a save', async () => {
    useEditor.getState().openBlank('x');
    const editor = useEditor.getState();
    editor.setHandle({ path: '/p', project: editor.project!, missingAssets: [] });
    vi.stubGlobal('window', {
      vfxlab: {
        saveProject: async () => {
          useEditor.getState().dispatch({ type: 'set-timeline', patch: { fps: 12 } });
        },
      },
    });
    useEditor.getState().dispatch({ type: 'set-timeline', patch: { fps: 24 } });
    await saveCurrent();
    expect(useEditor.getState().dirty).toBe(true);
    vi.unstubAllGlobals();
  });

  it('returns from Export to the screen that opened it', () => {
    const editor = useEditor.getState();
    editor.openBlank('x');
    editor.go('export');
    expect(useEditor.getState().returnRoute).toBe('studio');
  });
});

it('skips the export preview when it would not fit in memory', () => {
  expect(exportTooLarge({ width: 1024, height: 1024, frames: 600, count: 4 })).toBe(true);
  expect(exportTooLarge({ width: 64, height: 64, frames: 24, count: 4 })).toBe(false);
});

it('ships the license text of every bundled package', () => {
  const text = readFileSync('THIRD_PARTY_LICENSES.txt', 'utf8');
  for (const name of [
    'pixelfx',
    'react',
    'react-dom',
    'zustand',
    'zod',
    'i18next',
    'react-i18next',
    'pngjs',
    'gifuct-js',
    'gifenc',
    'fflate',
    'js-binary-schema-parser',
    'SIL OPEN FONT LICENSE',
  ])
    expect(text).toContain(name);
  expect(readFileSync('electron-builder.yml', 'utf8')).toContain('THIRD_PARTY_LICENSES.txt');
});
