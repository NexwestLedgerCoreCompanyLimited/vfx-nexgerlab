import type { NumberKeyframe } from '../shared/schemas/project';
import { easeValue } from './easing';

/** The value at a frame. Before the first key and after the last, it holds that key. */
export function sampleNumberTrack(
  track: readonly NumberKeyframe[] | undefined,
  frame: number,
  fallback: number,
): number {
  if (!track?.length) return fallback;
  let next = track.findIndex((k) => k.frame > frame);
  if (next === -1) next = track.length;
  const a = track[next - 1];
  const b = track[next];
  if (!a) return track[0]!.value;
  if (!b) return a.value;
  const t = (frame - a.frame) / (b.frame - a.frame);
  return a.value + (b.value - a.value) * easeValue(a.easing, t);
}
