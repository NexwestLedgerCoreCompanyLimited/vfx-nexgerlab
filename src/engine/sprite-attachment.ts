import type { SpriteAttachment } from '../shared/schemas/project';

export interface Point {
  x: number;
  y: number;
}

export interface ResolvedSpriteFrame {
  sourceFrameIndex: number;
  pivot: Point;
  anchor: Point;
  behindPartIds: string[];
  inFrontPartIds: string[];
}

/** Which source frame shows on each output frame, looping a sprite shorter than the output. */
export function mapOutputFrames(
  sourceFrames: number,
  sourceFps: number,
  outputFrames: number,
  outputFps: number,
): number[] {
  return Array.from(
    { length: outputFrames },
    (_, i) => Math.floor((i * sourceFps) / outputFps) % sourceFrames,
  );
}

export function resolveAttachmentFrame(
  attachment: SpriteAttachment,
  outputFrame: number,
): ResolvedSpriteFrame {
  // a longer timeline than the sprite map keeps looping the sprite
  const map = attachment.outputToSourceFrames;
  const sourceFrameIndex = map[outputFrame % map.length];
  if (sourceFrameIndex === undefined) throw new RangeError(`No output frame ${outputFrame}`);
  const set = attachment.frameAnchors.find((f) => f.sourceFrameIndex === sourceFrameIndex);
  return {
    sourceFrameIndex,
    pivot: set?.pivot ?? { x: 0, y: 0 },
    anchor: set?.anchor ?? { x: 0, y: 0 },
    behindPartIds: attachment.behindPartIds,
    inFrontPartIds: attachment.inFrontPartIds,
  };
}

export function setFrameAnchor(
  attachment: SpriteAttachment,
  sourceFrameIndex: number,
  pivot: Point,
  anchor: Point,
): SpriteAttachment {
  return {
    ...attachment,
    frameAnchors: [
      ...attachment.frameAnchors.filter((f) => f.sourceFrameIndex !== sourceFrameIndex),
      { sourceFrameIndex, pivot, anchor },
    ],
  };
}
