import { describe, expect, it } from 'vitest';
import { getEffect } from '../../src/engine/effect-registry';
import { createProjectFromEffect, exportFrameCount } from '../../src/engine/project-factory';
import { ProjectSchema } from '../../src/shared/schemas/project';

describe('createProjectFromEffect', () => {
  it('builds a valid project from each kind of effect', () => {
    for (const id of [
      'fire/campfire',
      'holy/heal',
      'moves/ground-pound',
      'transitions/iris',
      'explosions/nuke',
    ]) {
      expect(
        ProjectSchema.safeParse(createProjectFromEffect(id, { name: 'x', language: 'en' })).success,
        id,
      ).toBe(true);
    }
  });

  it('takes canvas, FPS, frames, and loop from a plain effect', () => {
    const p = createProjectFromEffect('fire/campfire', { name: 'กองไฟ', language: 'th' });
    expect(p.name).toBe('กองไฟ');
    expect(p.canvas).toMatchObject({ width: 128, height: 128 });
    expect(p.timeline).toEqual({ frames: 90, fps: 30, loop: true });
    expect(p.layers[0]).toMatchObject({
      effectId: 'fire/campfire',
      x: getEffect('fire/campfire')!.meta.origin[0],
    });
  });

  it('adds one last empty frame for a one-shot', () => {
    const meta = getEffect('explosions/small-explosion')!.meta;
    const p = createProjectFromEffect('explosions/small-explosion', { name: 'x', language: 'en' });
    expect(p.timeline.frames).toBe(Math.round(meta.duration * 30) + 1);
    expect(p.timeline.loop).toBe(false);
  });

  it('makes room for the whole performance of an acted effect', () => {
    const p = createProjectFromEffect('moves/ground-pound', { name: 'x', language: 'en' });
    expect(p.canvas.width).toBeGreaterThan(getEffect('moves/ground-pound')!.meta.size[0]! - 1);
    expect(p.timeline.frames).toBeGreaterThan(Math.round(3.82 * 30));
    expect(exportFrameCount(p)).toBe(
      Math.round(getEffect('moves/ground-pound')!.meta.duration * 30) + 1,
    );
  });

  it('refuses an unknown effect', () => {
    expect(() => createProjectFromEffect('no/such', { name: 'x', language: 'en' })).toThrow();
  });
});
