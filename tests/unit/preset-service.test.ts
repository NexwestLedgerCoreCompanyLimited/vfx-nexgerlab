import { describe, expect, it } from 'vitest';
import { applyPreset, savePreset, searchMyEffects } from '../../src/engine/presets';
import { createProjectFromEffect } from '../../src/engine/project-factory';
import { branchVersion, createVersion, restoreVersion } from '../../src/engine/versions';

const start = () => createProjectFromEffect('fire/campfire', { name: 'x', language: 'en' });

describe('My Effects', () => {
  it('saves and finds a preset by name or tag, in any language', () => {
    const p = savePreset(start(), { name: 'ไฟฟ้า', tags: ['fire', 'blue'] });
    expect(searchMyEffects(p, 'ไฟ')).toHaveLength(1);
    expect(searchMyEffects(p, 'BLUE')).toHaveLength(1);
    expect(searchMyEffects(p, 'ice')).toHaveLength(0);
    expect(searchMyEffects(p, '')).toHaveLength(1);
  });

  it('stays inside its project', () => {
    const p = savePreset(start(), { name: 'mine', tags: [] });
    expect(searchMyEffects(start(), 'mine')).toHaveLength(0);
    expect(p.presets).toHaveLength(1);
  });

  it('applies as new layers with new ids in a new version', () => {
    const p = savePreset(start(), { name: 'mine', tags: [] });
    const next = applyPreset(p, p.presets[0]!.id);
    expect(next.layers).toHaveLength(2);
    expect(new Set(next.layers.map((l) => l.id)).size).toBe(2);
    expect(next.versions).toHaveLength(2);
  });
});

describe('versions', () => {
  it('restores a snapshot without losing later ones', () => {
    const a = start();
    const edited = { ...a, layers: [{ ...a.layers[0]!, light: 0.5 }] };
    const b = createVersion(edited, 'Dim');
    const c = restoreVersion(b, a.versions[0]!.id);
    expect(c.layers[0]!.light).toBe(1);
    expect(c.activeVersionId).toBe(a.versions[0]!.id);
    expect(c.versions).toHaveLength(2);
  });

  it('branches from any version and keeps its parent', () => {
    const a = createVersion(start(), 'One');
    const b = branchVersion(a, a.versions[0]!.id, 'Side');
    expect(b.versions.at(-1)).toMatchObject({ label: 'Side', parentId: a.versions[0]!.id });
    expect(b.activeVersionId).toBe(b.versions.at(-1)!.id);
  });

  it('refuses an unknown version', () => {
    expect(() => restoreVersion(start(), 'nope')).toThrow();
  });
});
