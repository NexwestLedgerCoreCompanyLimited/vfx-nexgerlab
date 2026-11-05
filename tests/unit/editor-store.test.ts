import { beforeEach, describe, expect, it } from 'vitest';
import { useEditor } from '../../src/renderer/src/features/editor/use-editor-store';

const state = () => useEditor.getState();

describe('editor store', () => {
  beforeEach(() => state().reset());

  it('opens a library effect on Quick Look with the layer selected', () => {
    state().openEffect('fire/campfire', 'Campfire', 'en');
    expect(state()).toMatchObject({ route: 'quick-look', currentFrame: 0, dirty: false });
    expect(state().selectedLayerId).toBe(state().project!.layers[0]!.id);
  });

  it('goes through undo and redo and marks the project dirty', () => {
    state().openEffect('fire/campfire', 'Campfire', 'en');
    const id = state().selectedLayerId!;
    state().dispatch({ type: 'set-layer', layerId: id, patch: { light: 0.5 } });
    expect(state().dirty).toBe(true);
    expect(state().project!.layers[0]!.light).toBe(0.5);
    state().undo();
    expect(state().project!.layers[0]!.light).toBe(1);
    state().redo();
    expect(state().project!.layers[0]!.light).toBe(0.5);
  });

  it('counts render revisions for every project change', () => {
    state().openEffect('fire/campfire', 'Campfire', 'en');
    const before = state().renderRevision;
    state().dispatch({ type: 'set-layer', layerId: state().selectedLayerId!, patch: { seed: 2 } });
    expect(state().renderRevision).toBe(before + 1);
  });

  it('keeps the frame in range when the timeline shrinks', () => {
    state().openEffect('fire/campfire', 'Campfire', 'en');
    state().setFrame(80);
    state().dispatch({ type: 'set-timeline', patch: { frames: 10 } });
    expect(state().currentFrame).toBe(9);
  });

  it('clamps setFrame', () => {
    state().openEffect('fire/campfire', 'Campfire', 'en');
    state().setFrame(9999);
    expect(state().currentFrame).toBe(89);
    state().setFrame(-1);
    expect(state().currentFrame).toBe(0);
  });

  it('moves the selection when a selected layer is removed', () => {
    state().openEffect('fire/campfire', 'Campfire', 'en');
    state().dispatch({ type: 'remove-layer', layerId: state().selectedLayerId! });
    expect(state().selectedLayerId).toBeUndefined();
  });
});
