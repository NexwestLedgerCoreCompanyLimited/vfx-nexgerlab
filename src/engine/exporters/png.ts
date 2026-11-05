import UPNG from 'upng-js';
import type { FrameRGBA } from '../render-types';

const toBuffer = (frame: FrameRGBA): ArrayBuffer =>
  frame.pixels.buffer.slice(
    frame.pixels.byteOffset,
    frame.pixels.byteOffset + frame.pixels.byteLength,
  ) as ArrayBuffer;

/** Lossless RGBA: a color count of 0 turns off UPNG's quantizer. */
export function encodePng(frame: FrameRGBA): Uint8Array {
  return new Uint8Array(UPNG.encode([toBuffer(frame)], frame.width, frame.height, 0));
}

export function encodeApngFrames(frames: FrameRGBA[], durationsMs: number[]): Uint8Array {
  const first = frames[0]!;
  return new Uint8Array(
    UPNG.encode(frames.map(toBuffer), first.width, first.height, 0, durationsMs),
  );
}
