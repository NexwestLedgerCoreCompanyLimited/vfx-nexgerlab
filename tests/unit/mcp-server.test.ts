import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { handleMessage, TOOLS } from '../../src/mcp/server';
import { MCP_TOOL_NAMES } from '../../src/shared/mcp-tools';

const root = () => mkdtempSync(join(tmpdir(), 'mcp-'));
const call = async (dir: string, name: string, args: unknown) => {
  const r = await handleMessage(
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
    dir,
  );
  return r!.result as {
    content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
  };
};
const text = (r: Awaited<ReturnType<typeof call>>) =>
  JSON.parse(r.content.find((c) => c.type === 'text')!.text!);

describe('protocol', () => {
  it('negotiates and names itself', async () => {
    const r = await handleMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      root(),
    );
    expect(r!.result).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'vfx-nexgerlab' },
    });
  });

  it('answers an unknown protocol version with its own', async () => {
    const r = await handleMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
      root(),
    );
    expect((r!.result as { protocolVersion: string }).protocolVersion).not.toBe('1999-01-01');
  });

  it('stays silent on notifications and answers ping', async () => {
    expect(
      await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, root()),
    ).toBeUndefined();
    expect(
      (await handleMessage({ jsonrpc: '2.0', id: 2, method: 'ping' }, root()))!.result,
    ).toEqual({});
  });

  it('reports unknown methods', async () => {
    expect(
      (await handleMessage({ jsonrpc: '2.0', id: 3, method: 'nope' }, root()))!.error!.code,
    ).toBe(-32601);
  });

  it('lists tools with schemas', async () => {
    const r = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, root());
    const { tools } = r!.result as {
      tools: Array<{ name: string; description: string; inputSchema: { type: string } }>;
    };
    expect(tools.map((t) => t.name).sort()).toEqual(TOOLS.map((t) => t.name).sort());
    for (const t of tools) {
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.inputSchema.type).toBe('object');
    }
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'list_effects',
        'render_effect',
        'create_character',
        'create_map',
        'create_tileset',
        'compose_effect',
        'create_project',
      ]),
    );
  });
});

describe('tools', () => {
  it('finds effects', async () => {
    const r = text(await call(root(), 'list_effects', { query: 'campfire' }));
    expect(r.effects[0]).toMatchObject({ id: 'fire/campfire' });
  });

  it('renders an effect to real files and returns a preview', async () => {
    const dir = root();
    const r = await call(dir, 'render_effect', {
      effect_id: 'pickups/coin-spin',
      formats: ['sheet', 'gif'],
      name: 'coin',
    });
    const files = text(r).files as string[];
    expect(files.some((f) => f.endsWith('coin.png'))).toBe(true);
    expect(files.some((f) => f.endsWith('coin.json'))).toBe(true);
    expect(files.some((f) => f.endsWith('coin.gif'))).toBe(true);
    for (const f of files) expect(existsSync(f)).toBe(true);
    expect(r.content.find((c) => c.type === 'image')).toMatchObject({ mimeType: 'image/png' });
  });

  it('creates an animated character', async () => {
    const dir = root();
    const r = await call(dir, 'create_character', {
      description: 'knight in blue',
      animations: ['walk', 'attack'],
      directions: 4,
    });
    const out = text(r);
    expect(out.spec.role).toBe('knight');
    expect(out.files.filter((f: string) => f.endsWith('.png'))).toHaveLength(2);
  });

  it('shows unsupported words rather than guessing', async () => {
    expect(
      text(await call(root(), 'create_character', { description: 'knight dragon' })).unsupported,
    ).toEqual(['dragon']);
  });

  it.each(['topdown', 'sidescroller', 'isometric', 'voxel3d'])('creates a %s map', async (kind) => {
    const dir = root();
    const files = text(await call(dir, 'create_map', { kind, width: 16, height: 16, seed: 2 }))
      .files as string[];
    expect(files.some((f) => f.endsWith('.png'))).toBe(true);
    expect(files.some((f) => f.endsWith('.tmj'))).toBe(true);
    if (kind === 'voxel3d') {
      expect(files.some((f) => f.endsWith('.glb'))).toBe(true);
      expect(files.some((f) => f.endsWith('.obj'))).toBe(true);
    }
  });

  it('creates a Wang tileset', async () => {
    expect(
      text(await call(root(), 'create_tileset', { lower: 'grass', upper: 'sand' })).files,
    ).toHaveLength(1);
  });

  it('composes from an instruction and reports what it could not use', async () => {
    const r = text(await call(root(), 'compose_effect', { instruction: 'blue fire dragons' }));
    expect(r.recognized.length).toBeGreaterThan(0);
    expect(r.unsupported[0].text).toBe('dragons');
    expect(r.files.length).toBeGreaterThan(0);
  });

  it('creates a project the app can open', async () => {
    const dir = root();
    const r = text(
      await call(dir, 'create_project', { name: 'งาน', effect_ids: ['fire/campfire'] }),
    );
    const file = JSON.parse(readFileSync(join(r.path, 'project.vfxlab.json'), 'utf8'));
    expect(file.layers).toHaveLength(1);
    expect(readdirSync(r.path).sort()).toEqual([
      'assets',
      'exports',
      'presets',
      'project.vfxlab.json',
    ]);
  });
});

describe('safety', () => {
  it('never writes outside its output folder', async () => {
    const dir = root();
    const files = text(
      await call(dir, 'create_tileset', { lower: 'grass', upper: 'sand', name: '../../evil' }),
    ).files as string[];
    expect(files[0]!.startsWith(dir)).toBe(true);
    expect(files[0]).not.toContain('..');
  });

  it('never overwrites: a repeat gets a new folder', async () => {
    const dir = root();
    const a = text(await call(dir, 'create_tileset', { lower: 'grass', upper: 'sand', name: 'x' }))
      .files[0];
    const b = text(await call(dir, 'create_tileset', { lower: 'grass', upper: 'sand', name: 'x' }))
      .files[0];
    expect(a).not.toBe(b);
  });

  it.each([
    ['render_effect', { effect_id: '../../etc/passwd' }],
    ['render_effect', { effect_id: 'fire/campfire', options: { evil: 1 } }],
    ['create_map', { kind: 'topdown', width: 100000, height: 16 }],
    ['create_map', { kind: 'nope', width: 16, height: 16 }],
    ['create_character', {}],
  ])('turns bad input for %s into a tool error', async (name, args) => {
    const r = await call(root(), name, args);
    expect(r.isError).toBe(true);
  });

  it('reports an unknown tool as an error result', async () => {
    expect((await call(root(), 'rm_rf', {})).isError).toBe(true);
  });
});

it('keeps the Connect AI list in step with the server', () => {
  expect([...MCP_TOOL_NAMES].sort()).toEqual(TOOLS.map((t) => t.name).sort());
});
