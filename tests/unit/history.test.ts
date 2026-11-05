import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyCommand, type EditorCommand } from '../../src/engine/commands';
import { createHistory, execute, redo, undo } from '../../src/engine/history';
import type { ProjectV1 } from '../../src/shared/schemas/project';

const project = (): ProjectV1 =>
  JSON.parse(
    readFileSync(join(__dirname, '../fixtures/projects/valid-v1/project.vfxlab.json'), 'utf8'),
  );
const layerId = project().layers[0]!.id;
const setLight = (light: number, gestureId?: string): EditorCommand => ({
  type: 'set-layer',
  layerId,
  patch: { light },
  gestureId,
});

describe('applyCommand', () => {
  it('changes a copy', () => {
    const p = project();
    const next = applyCommand(p, setLight(0.5));
    expect(next.layers[0]!.light).toBe(0.5);
    expect(p.layers[0]!.light).toBe(1);
  });

  it('rejects a value the schema refuses and leaves the project alone', () => {
    expect(() => applyCommand(project(), setLight(9))).toThrow();
    expect(() =>
      applyCommand(project(), { type: 'set-layer', layerId: 'nope', patch: {} }),
    ).toThrow();
  });

  it('cannot change a layer id or kind through a patch', () => {
    const next = applyCommand(project(), {
      type: 'set-layer',
      layerId,
      patch: { id: 'x', kind: 'y' } as never,
    });
    expect(next.layers[0]!.id).toBe(layerId);
    expect(next.layers[0]!.kind).toBe('effect');
  });

  it('adds, moves, and removes layers', () => {
    const second = { ...project().layers[0]!, id: '99999999-9999-4999-8999-999999999999' };
    let p = applyCommand(project(), { type: 'add-layer', layer: second });
    expect(p.layers.map((l) => l.id)).toEqual([layerId, second.id]);
    p = applyCommand(p, { type: 'move-layer', layerId: second.id, toIndex: 0 });
    expect(p.layers.map((l) => l.id)).toEqual([second.id, layerId]);
    p = applyCommand(p, { type: 'remove-layer', layerId });
    expect(p.layers.map((l) => l.id)).toEqual([second.id]);
  });

  it('sets the timeline within bounds', () => {
    const p = applyCommand(project(), { type: 'set-timeline', patch: { fps: 60 } });
    expect(p.timeline.fps).toBe(60);
    expect(() => applyCommand(project(), { type: 'set-timeline', patch: { frames: 0 } })).toThrow();
  });
});

describe('history', () => {
  it('keeps at least 100 entries', () => {
    const h = createHistory(project());
    for (let i = 0; i < 150; i++) execute(h, setLight((i % 20) / 10));
    let steps = 0;
    while (h.past.length) {
      undo(h);
      steps++;
    }
    expect(steps).toBeGreaterThanOrEqual(100);
  });

  it('undoes and redoes exactly', () => {
    const h = createHistory(project());
    execute(h, setLight(0.5));
    expect(undo(h).layers[0]!.light).toBe(1);
    expect(redo(h).layers[0]!.light).toBe(0.5);
  });

  it('clears redo after a new edit', () => {
    const h = createHistory(project());
    execute(h, setLight(0.5));
    undo(h);
    execute(h, setLight(0.7));
    expect(redo(h).layers[0]!.light).toBe(0.7);
  });

  it('stays put at the ends of the stack', () => {
    const h = createHistory(project());
    expect(undo(h)).toBe(h.present);
    expect(redo(h)).toBe(h.present);
  });

  it('collapses a slider drag into one undo', () => {
    const h = createHistory(project());
    for (const v of [0.1, 0.2, 0.3, 0.4]) execute(h, setLight(v, 'drag-1'));
    expect(h.present.layers[0]!.light).toBe(0.4);
    expect(undo(h).layers[0]!.light).toBe(1);
    expect(h.past).toHaveLength(0);
  });

  it('keeps separate gestures separate', () => {
    const h = createHistory(project());
    execute(h, setLight(0.1, 'a'));
    execute(h, setLight(0.2, 'b'));
    expect(undo(h).layers[0]!.light).toBe(0.1);
  });
});
