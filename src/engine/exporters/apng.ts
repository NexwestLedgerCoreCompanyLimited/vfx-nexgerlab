import type { FrameRGBA } from '../render-types';
import { encodeApngFrames } from './png';

export function encodeApng(frames: FrameRGBA[], durationsMs: number[], loop = true): Uint8Array {
  if (frames.length === 0) throw new Error('No frames to encode');
  return encodeApngFrames(frames, durationsMs, loop);
}
