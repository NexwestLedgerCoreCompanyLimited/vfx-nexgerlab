import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import {
  animationFrames,
  ANIMATIONS,
  type AnimationName,
  renderCharacterSheet,
} from '../engine/characters/animate';
import { parseCharacterDescription } from '../engine/characters/spec';
import { applyComposerTurn } from '../engine/composer/actions';
import { parseInstruction } from '../engine/composer/parser';
import { resolveDirectionProject } from '../engine/directions';
import {
  CATEGORIES,
  ENGINE_VERSION,
  getEffect,
  listEffects,
  validateEffectOptions,
} from '../engine/effect-registry';
import { encodeApng } from '../engine/exporters/apng';
import { encodeGif } from '../engine/exporters/gif';
import { buildExportMetadata } from '../engine/exporters/metadata';
import { encodePng } from '../engine/exporters/png';
import { calculateSheetLayout, packSheet } from '../engine/exporters/spritesheet';
import { BIOMES, createMap, MAP_KINDS, renderMap, TILES, type TileName } from '../engine/maps/map';
import { buildVoxelMesh, encodeGlb, encodeObj } from '../engine/maps/mesh';
import { renderWangTileset, tilesetFrame, toTiledJson } from '../engine/maps/tiles';
import { PAL } from '../engine/pixelfx/src/core/index.js';
import {
  createEffectLayer,
  createProjectFromEffect,
  exportFrameCount,
} from '../engine/project-factory';
import { createRenderCache, renderProjectFrame } from '../engine/render-model';
import type { FrameRGBA, RenderOptions } from '../engine/render-types';
import { DIRECTION_ORDER, type DirectionCount } from '../shared/directions';
import { newProject } from '../shared/models/new-project';
import { ProjectSchema, type ProjectV1 } from '../shared/schemas/project';

export const SERVER_VERSION = '0.2.0';
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_PREVIEW_PIXELS = 1_000_000;
const WHOLE: RenderOptions = { partFilter: 'whole', includeStage: false };

export interface RpcMessage {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

export interface RpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run(args: unknown, out: Output): Promise<Content[]>;
}

/** Everything a tool writes lands in a fresh folder under the root, so nothing is ever overwritten. */
class Output {
  files: string[] = [];
  constructor(readonly root: string) {}

  async folder(name: string): Promise<string> {
    const base = safeName(name);
    await mkdir(this.root, { recursive: true });
    for (let i = 0; i < 10_000; i++) {
      const dir = join(this.root, i ? `${base}-${i + 1}` : base);
      try {
        await mkdir(dir);
        return dir;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
    throw new Error('Too many outputs with this name');
  }

  async write(dir: string, file: string, data: Uint8Array | string): Promise<void> {
    const path = join(dir, file);
    await writeFile(path, data, { flag: 'wx' });
    this.files.push(path);
  }
}

function safeName(name: string): string {
  const clean = name
    // oxlint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\.\.+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
  return clean.slice(0, 80) || 'output';
}

const reply = (data: object, ...extra: Content[]): Content[] => [
  { type: 'text', text: JSON.stringify(data, null, 2) },
  ...extra,
];

function preview(frame: FrameRGBA): Content[] {
  if (frame.width * frame.height > MAX_PREVIEW_PIXELS) return [];
  return [
    {
      type: 'image',
      data: Buffer.from(encodePng(frame)).toString('base64'),
      mimeType: 'image/png',
    },
  ];
}

const Seed = z.number().int().min(0).max(0xffffffff).default(1);
const Directions = z.union([z.literal(1), z.literal(4), z.literal(8), z.literal(16)]).default(1);
const Name = z.string().min(1).max(80).optional();

function renderFrames(
  project: ProjectV1,
  count: DirectionCount,
): { frames: FrameRGBA[]; rows: number } {
  const order = DIRECTION_ORDER[count];
  const total = exportFrameCount(project);
  const frames: FrameRGBA[] = [];
  for (const direction of order) {
    const view = resolveDirectionProject(project, direction, count);
    const cache = createRenderCache();
    for (let i = 0; i < total; i++) {
      frames.push(renderProjectFrame(view, i, new Map(), WHOLE, cache).frame);
    }
  }
  return { frames, rows: order.length };
}

async function exportProject(
  project: ProjectV1,
  name: string,
  formats: string[],
  count: DirectionCount,
  out: Output,
) {
  const dir = await out.folder(name);
  const base = safeName(name);
  const { frames } = renderFrames(project, count);
  const first = frames[0]!;
  const perDirection = frames.length / DIRECTION_ORDER[count].length;
  const durations = Array.from({ length: perDirection }, () =>
    Math.round(1000 / project.timeline.fps),
  );
  if (formats.includes('sheet')) {
    const layout = calculateSheetLayout({
      frameWidth: first.width,
      frameHeight: first.height,
      frames: perDirection,
      directions: DIRECTION_ORDER[count],
    });
    await out.write(dir, `${base}.png`, encodePng(packSheet(layout, frames)));
    const metadata = buildExportMetadata({
      project,
      layout,
      image: `${base}.png`,
      includeAct: true,
    });
    await out.write(dir, `${base}.json`, JSON.stringify(metadata, null, 1));
  }
  const firstDirection = frames.slice(0, perDirection);
  if (formats.includes('gif'))
    await out.write(
      dir,
      `${base}.gif`,
      encodeGif(firstDirection, durations, project.timeline.loop),
    );
  if (formats.includes('apng'))
    await out.write(
      dir,
      `${base}.apng`,
      encodeApng(firstDirection, durations, project.timeline.loop),
    );
  return frames[Math.floor(perDirection / 2)]!;
}

const EffectFormats = z
  .array(z.enum(['sheet', 'gif', 'apng']))
  .min(1)
  .default(['sheet']);

const RenderEffect = z.strictObject({
  effect_id: z.string().max(80),
  name: Name,
  palette: z.string().max(40).optional(),
  seed: Seed,
  directions: Directions,
  formats: EffectFormats,
  options: z.record(z.string(), z.unknown()).default({}),
});

const CreateCharacter = z.strictObject({
  description: z.string().min(1).max(200),
  name: Name,
  seed: Seed,
  animations: z
    .array(z.enum(Object.keys(ANIMATIONS) as [AnimationName, ...AnimationName[]]))
    .min(1)
    .default(['idle', 'walk']),
  directions: Directions.default(4),
});

const CreateMap = z.strictObject({
  kind: z.enum(MAP_KINDS),
  width: z.number().int().min(8).max(256).default(32),
  height: z.number().int().min(8).max(256).default(32),
  seed: Seed,
  biome: z.enum(BIOMES).default('temperate'),
  name: Name,
});

const Terrain = z.enum(TILES.filter((t) => t !== 'air') as [TileName, ...TileName[]]);

const string = (description: string) => ({ type: 'string', description });
const integer = (description: string) => ({ type: 'integer', description });
const directionsField = {
  type: 'integer',
  enum: [1, 4, 8, 16],
  description: 'How many facing directions to export.',
};

export const TOOLS: Tool[] = [
  {
    name: 'list_effects',
    description: 'Search the bundled library of 244 pixel art effects by word or category.',
    inputSchema: {
      type: 'object',
      properties: {
        query: string('Word to look for.'),
        category: string('Category id.'),
        limit: integer('Most results to return.'),
      },
    },
    async run(args) {
      const { query, category, limit } = z
        .strictObject({
          query: z.string().max(80).default(''),
          category: z.string().max(40).optional(),
          limit: z.number().int().min(1).max(244).default(20),
        })
        .parse(args);
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const effects = listEffects()
        .filter((e) => !category || e.category === category)
        .filter((e) =>
          words.every((w) =>
            `${e.id} ${e.meta.name} ${e.meta.desc} ${e.meta.tags.join(' ')}`
              .toLowerCase()
              .includes(w),
          ),
        )
        .slice(0, limit)
        .map((e) => ({
          id: e.id,
          name: e.meta.name,
          description: e.meta.desc,
          loop: e.meta.loop,
          seconds: e.meta.duration,
          options: Object.keys(e.meta.options),
        }));
      return reply({ effects, categories: CATEGORIES.map((c) => c.id) });
    },
  },
  {
    name: 'list_palettes',
    description: 'List the named color palettes that render_effect can use.',
    inputSchema: { type: 'object', properties: {} },
    async run() {
      return reply({ palettes: PAL });
    },
  },
  {
    name: 'render_effect',
    description:
      'Render one effect to a transparent sprite sheet with JSON, a GIF, or an APNG, and return a preview.',
    inputSchema: {
      type: 'object',
      required: ['effect_id'],
      properties: {
        effect_id: string('Effect id from list_effects, such as fire/campfire.'),
        name: string('Output name.'),
        palette: string('Palette name from list_palettes.'),
        seed: integer('Random pattern.'),
        directions: directionsField,
        formats: { type: 'array', items: { type: 'string', enum: ['sheet', 'gif', 'apng'] } },
        options: { type: 'object', description: 'Options listed by list_effects.' },
      },
    },
    async run(args, out) {
      const input = RenderEffect.parse(args);
      const mod = getEffect(input.effect_id);
      if (!mod) throw new Error(`Unknown effect ${input.effect_id}`);
      const ramp = input.palette ? (PAL as Record<string, string[]>)[input.palette] : undefined;
      if (input.palette && !ramp) throw new Error(`Unknown palette ${input.palette}`);
      const options = { ...input.options, ...(ramp ? { palette: ramp } : {}) };
      const checked = validateEffectOptions(input.effect_id, options);
      if (!checked.ok) throw new Error(`Bad options: ${checked.reason}`);
      const name = input.name ?? mod.meta.name;
      const base = createProjectFromEffect(input.effect_id, { name, language: 'en' });
      const project = {
        ...base,
        layers: base.layers.map((l) => ({ ...l, seed: input.seed, options: checked.options })),
      };
      const frame = await exportProject(
        project,
        name,
        input.formats,
        input.directions as DirectionCount,
        out,
      );
      return reply({ files: out.files }, ...preview(frame));
    },
  },
  {
    name: 'compose_effect',
    description:
      'Read a plain instruction in English or Thai, build an effect from the words it knows, and render it. Shows unsupported words.',
    inputSchema: {
      type: 'object',
      required: ['instruction'],
      properties: {
        instruction: string('For example: blue fire 2 seconds.'),
        language: { type: 'string', enum: ['en', 'th'] },
        name: string('Output name.'),
      },
    },
    async run(args, out) {
      const input = z
        .strictObject({
          instruction: z.string().min(1).max(300),
          language: z.enum(['en', 'th']).default('en'),
          name: Name,
        })
        .parse(args);
      const parsed = parseInstruction(input.instruction, input.language, {});
      const first = parsed.recognizedActions.find((a) => a.type === 'effect');
      if (!first || first.type !== 'effect') {
        return reply({
          recognized: parsed.recognizedActions,
          unsupported: parsed.unsupportedTerms,
          files: [],
          hint: 'Name an effect, such as fire or explosion.',
        });
      }
      const name = input.name ?? input.instruction;
      const base = createProjectFromEffect(first.effectId, {
        name: name.slice(0, 80),
        language: input.language,
      });
      const project = applyComposerTurn(base, {
        input: input.instruction,
        language: input.language,
        parsed,
        layerId: base.layers[0]?.id,
      });
      const frame = await exportProject(project, name, ['sheet', 'gif'], 1, out);
      return reply(
        {
          recognized: parsed.recognizedActions,
          unsupported: parsed.unsupportedTerms,
          files: out.files,
        },
        ...preview(frame),
      );
    },
  },
  {
    name: 'create_character',
    description:
      'Make an animated character from a description, with sprite sheets and JSON for each animation.',
    inputSchema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: string(
          'Role, colors, and weapon, in English or Thai. For example: knight in blue with a sword.',
        ),
        name: string('Output name.'),
        seed: integer('Changes hair, skin, and clothes.'),
        animations: { type: 'array', items: { type: 'string', enum: Object.keys(ANIMATIONS) } },
        directions: directionsField,
      },
    },
    async run(args, out) {
      const input = CreateCharacter.parse(args);
      const { spec, unsupported } = parseCharacterDescription(input.description, input.seed);
      const dir = await out.folder(input.name ?? spec.name);
      await out.write(dir, 'character.json', JSON.stringify(spec, null, 2));
      let shown: FrameRGBA | undefined;
      for (const animation of input.animations) {
        const { sheet, metadata, frames } = renderCharacterSheet(
          spec,
          animation,
          input.directions as DirectionCount,
        );
        await out.write(dir, `${animation}.png`, encodePng(sheet));
        await out.write(dir, `${animation}.json`, JSON.stringify(metadata, null, 1));
        shown ??= frames[Math.floor(animationFrames(animation).length / 2)];
      }
      return reply({ spec, unsupported, files: out.files }, ...(shown ? preview(shown) : []));
    },
  },
  {
    name: 'create_map',
    description:
      'Generate a map: top-down, side-scroller, isometric, or 3D voxel. Writes PNG, Tiled JSON, a tileset, and GLB and OBJ for 3D.',
    inputSchema: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: MAP_KINDS },
        width: integer('Tiles across, 8 to 256.'),
        height: integer('Tiles down, 8 to 256.'),
        seed: integer('Random pattern.'),
        biome: { type: 'string', enum: BIOMES },
        name: string('Output name.'),
      },
    },
    async run(args, out) {
      const input = CreateMap.parse(args);
      const map = createMap(input);
      const dir = await out.folder(input.name ?? `${input.kind}-map`);
      const frame = renderMap(map);
      await out.write(dir, 'map.png', encodePng(frame));
      await out.write(dir, 'tileset.png', encodePng(tilesetFrame(map.seed)));
      await out.write(dir, 'map.tmj', JSON.stringify(toTiledJson(map, 'tileset.png')));
      if (input.kind === 'voxel3d') {
        const mesh = buildVoxelMesh(map);
        await out.write(dir, 'map.glb', encodeGlb(mesh));
        await out.write(dir, 'map.obj', encodeObj(mesh));
      }
      return reply({ files: out.files }, ...preview(frame));
    },
  },
  {
    name: 'create_tileset',
    description: 'Make a 16-tile Wang tileset that blends two terrains.',
    inputSchema: {
      type: 'object',
      required: ['lower', 'upper'],
      properties: {
        lower: { type: 'string', enum: TILES.slice(1) },
        upper: { type: 'string', enum: TILES.slice(1) },
        seed: integer('Random pattern.'),
        name: string('Output name.'),
      },
    },
    async run(args, out) {
      const input = z
        .strictObject({ lower: Terrain, upper: Terrain, seed: Seed, name: Name })
        .parse(args);
      const dir = await out.folder(input.name ?? `${input.lower}-${input.upper}`);
      const frame = renderWangTileset(input.lower, input.upper, input.seed);
      await out.write(dir, 'wang.png', encodePng(frame));
      return reply({ files: out.files }, ...preview(frame));
    },
  },
  {
    name: 'create_project',
    description:
      'Create a project folder with these effects as layers, ready to open in the VFX NexgerLab app.',
    inputSchema: {
      type: 'object',
      required: ['name', 'effect_ids'],
      properties: {
        name: string('Project name.'),
        effect_ids: { type: 'array', items: { type: 'string' } },
      },
    },
    async run(args, out) {
      const input = z
        .strictObject({
          name: z.string().min(1).max(80),
          effect_ids: z.array(z.string().max(80)).min(1).max(64),
        })
        .parse(args);
      for (const id of input.effect_ids)
        if (!getEffect(id)) throw new Error(`Unknown effect ${id}`);
      const first = createProjectFromEffect(input.effect_ids[0]!, {
        name: input.name,
        language: 'en',
      });
      const blank = newProject(input.name);
      const layers = input.effect_ids.map((id, i) =>
        i === 0
          ? first.layers[0]!
          : createEffectLayer(id, first.canvas.width / 2, first.canvas.height - 1),
      );
      const project = ProjectSchema.parse({ ...first, id: blank.id, layers });
      const dir = await out.folder(input.name);
      for (const sub of ['assets', 'presets', 'exports']) await mkdir(join(dir, sub));
      await out.write(dir, 'project.vfxlab.json', JSON.stringify(project, null, 2));
      return reply({ path: dir, engineVersion: ENGINE_VERSION });
    },
  },
];

async function callTool(
  params: unknown,
  root: string,
): Promise<{ content: Content[]; isError?: boolean }> {
  const { name, arguments: args } = (params ?? {}) as { name?: string; arguments?: unknown };
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool)
    return { content: [{ type: 'text', text: `Unknown tool ${String(name)}` }], isError: true };
  try {
    return { content: await tool.run(args ?? {}, new Output(root)) };
  } catch (error) {
    const message = error instanceof z.ZodError ? z.prettifyError(error) : (error as Error).message;
    return { content: [{ type: 'text', text: message }], isError: true };
  }
}

/** One JSON-RPC message in, at most one out. Notifications get no reply. */
export async function handleMessage(
  message: RpcMessage,
  root: string,
): Promise<RpcResponse | undefined> {
  const { id, method, params } = message;
  if (id === undefined) return undefined;
  const ok = (result: unknown): RpcResponse => ({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'initialize': {
      const asked = (params as { protocolVersion?: string } | undefined)?.protocolVersion;
      return ok({
        protocolVersion: PROTOCOLS.includes(asked ?? '') ? asked : PROTOCOLS[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'vfx-nexgerlab', version: SERVER_VERSION },
        instructions:
          'Creates pixel art effects, characters, tilesets, and maps on this computer. Files go to the output folder.',
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({
        tools: TOOLS.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      });
    case 'tools/call':
      return ok(await callTool(params, root));
    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown method ${String(method)}` },
      };
  }
}
