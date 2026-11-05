import { describe, expect, it } from 'vitest';
import {
  mapOutputFrames,
  resolveAttachmentFrame,
  setFrameAnchor,
} from '../../src/engine/sprite-attachment';
import type { SpriteAttachment } from '../../src/shared/schemas/project';

const attachment = (over: Partial<SpriteAttachment> = {}): SpriteAttachment => ({
  id: 'a',
  assetId: 'b',
  outputToSourceFrames: [0, 0, 1, 1],
  frameAnchors: [],
  behindPartIds: ['back'],
  inFrontPartIds: ['front'],
  ...over,
});

describe('mapOutputFrames', () => {
  it('keeps timing across different frame rates', () => {
    expect(mapOutputFrames(2, 10, 6, 30)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(mapOutputFrames(4, 30, 2, 15)).toEqual([0, 2]);
  });

  it('loops a short sprite across a long output', () => {
    expect(mapOutputFrames(2, 30, 5, 30)).toEqual([0, 1, 0, 1, 0]);
  });

  it('covers every output frame exactly once', () => {
    expect(mapOutputFrames(7, 12, 600, 60)).toHaveLength(600);
  });
});

describe('resolveAttachmentFrame', () => {
  it('maps output to source and keeps part membership on every frame', () => {
    const a = attachment();
    expect([0, 1, 2, 3].map((f) => resolveAttachmentFrame(a, f).sourceFrameIndex)).toEqual([
      0, 0, 1, 1,
    ]);
    for (const f of [0, 3]) {
      expect(resolveAttachmentFrame(a, f)).toMatchObject({
        behindPartIds: ['back'],
        inFrontPartIds: ['front'],
      });
    }
  });

  it('uses per-source-frame anchors', () => {
    const a = setFrameAnchor(
      setFrameAnchor(attachment(), 1, { x: 1, y: 2 }, { x: 3, y: 4 }),
      0,
      { x: 0, y: 0 },
      { x: 9, y: 9 },
    );
    expect(resolveAttachmentFrame(a, 2).anchor).toEqual({ x: 3, y: 4 });
    expect(resolveAttachmentFrame(a, 2).pivot).toEqual({ x: 1, y: 2 });
    expect(resolveAttachmentFrame(a, 0).anchor).toEqual({ x: 9, y: 9 });
  });

  it('replaces an anchor edit without duplicating it', () => {
    const a = setFrameAnchor(
      setFrameAnchor(attachment(), 1, { x: 1, y: 1 }, { x: 1, y: 1 }),
      1,
      { x: 2, y: 2 },
      { x: 2, y: 2 },
    );
    expect(a.frameAnchors).toHaveLength(1);
  });

  it('defaults to a zero anchor', () => {
    expect(resolveAttachmentFrame(attachment(), 0).anchor).toEqual({ x: 0, y: 0 });
  });

  it('rejects an invalid output frame', () => {
    expect(() => resolveAttachmentFrame(attachment(), -1)).toThrow(RangeError);
    expect(() => resolveAttachmentFrame(attachment(), 1.5)).toThrow(RangeError);
  });
});
