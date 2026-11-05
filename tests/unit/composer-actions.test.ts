import { describe, expect, it } from 'vitest';
import { applyComposerTurn } from '../../src/engine/composer/actions';
import { parseInstruction } from '../../src/engine/composer/parser';
import { createProjectFromEffect } from '../../src/engine/project-factory';
import { ProjectSchema } from '../../src/shared/schemas/project';

const start = (id = 'fire/campfire') => createProjectFromEffect(id, { name: 'x', language: 'en' });
const apply = (p: ReturnType<typeof start>, text: string, language: 'en' | 'th' = 'en') => {
  const layerId = p.layers[0]?.id;
  const parsed = parseInstruction(text, language, { selectedEffectId: p.layers[0]?.effectId });
  return applyComposerTurn(p, { input: text, language, parsed, layerId });
};

describe('applyComposerTurn', () => {
  it('creates a restorable new version and records the turn', () => {
    const p = start();
    const next = apply(p, 'in blue');
    expect(next.versions).toHaveLength(2);
    expect(next.versions[1]!.parentId).toBe(p.activeVersionId);
    expect(next.activeVersionId).toBe(next.versions[1]!.id);
    expect(next.composerHistory[0]).toMatchObject({
      input: 'in blue',
      versionId: next.activeVersionId,
    });
    expect(next.layers[0]!.options.palette).toBeTruthy();
    expect(next.versions[0]!.layers[0]!.options.palette).toBeUndefined();
    expect(ProjectSchema.safeParse(next).success).toBe(true);
  });

  it('keeps the parent turn for refinements', () => {
    const a = apply(start(), 'in blue');
    const b = apply(a, 'faster');
    expect(b.composerHistory[1]!.parentTurnId).toBe(a.composerHistory[0]!.id);
  });

  it('never edits on unsupported terms alone', () => {
    const p = start();
    expect(apply(p, 'dragons')).toBe(p);
  });

  it('applies the supported part and records the unsupported part', () => {
    const next = apply(start(), 'in blue dragons');
    expect(next.composerHistory[0]!.unsupported).toEqual([{ text: 'dragons', reason: 'unknown' }]);
  });

  it('maps intensity to the act when there is one', () => {
    const next = apply(start('moves/ground-pound'), 'หนักขึ้น', 'th');
    expect(next.layers[0]!.actOverrides?.hits?.[0]).toEqual({ index: 0, stop: 0.26, amp: 5 });
  });

  it('maps intensity to light otherwise', () => {
    expect(apply(start(), 'stronger').layers[0]!.light).toBeCloseTo(1.3);
    expect(apply(start(), 'softer').layers[0]!.light).toBeCloseTo(0.7);
  });

  it('adds a layer for a new effect', () => {
    const next = apply(start(), 'explosion');
    expect(next.layers.map((l) => l.effectId)).toEqual([
      'fire/campfire',
      'explosions/small-explosion',
    ]);
  });

  it('applies duration, speed, flip, and placement', () => {
    expect(apply(start(), 'faster').layers[0]!.speed).toBe(2);
    expect(apply(start(), 'flip').layers[0]!.flip).toBe(true);
    expect(apply(start(), 'behind the sprite').layers[0]!.placement).toBe('behind-sprite');
    expect(apply(start(), '2 seconds').timeline.frames).toBe(60);
  });
});
