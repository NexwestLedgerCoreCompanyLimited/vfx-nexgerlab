import type { AssetFrame } from '../shared/models/asset';
import allowlist from './actor-allowlist.json';

export interface Actor {
  mask: { w: number; h: number; data: Uint8Array };
  pixels: Uint32Array;
  x: number;
  y: number;
  w: number;
  h: number;
  k: number;
  head: [number, number];
  chest: [number, number];
  eyes: [number, number][];
}

const SUPPORTED = new Set<string>(allowlist);
const STOCK_SCALE = 2;
const CHEST_AT = 0.32; // the stock character's chest sits about a third down its height
const EYES_AT = 0.1;

/** Turns a sprite frame into the shape effects draw on. anchor is the point between the feet. */
export function spriteToActor(frame: AssetFrame, anchor: { x: number; y: number }): Actor {
  const { width: w, height: h, rgba } = frame;
  const data = new Uint8Array(w * h);
  const pixels = new Uint32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3]!;
    if (a === 0) continue;
    data[i] = 1;
    pixels[i] =
      ((255 << 24) | (rgba[i * 4 + 2]! << 16) | (rgba[i * 4 + 1]! << 8) | rgba[i * 4]!) >>> 0;
  }
  const x = -Math.round(anchor.x);
  const y = -Math.round(anchor.y);
  const eyeRow = Math.floor(h * EYES_AT);
  return {
    mask: { w, h, data },
    pixels,
    x,
    y,
    w,
    h,
    k: STOCK_SCALE,
    head: [x + Math.floor(w / 2), y],
    chest: [x + Math.floor(w / 2), y + Math.floor(h * CHEST_AT)],
    eyes: [
      [Math.floor(w * 0.4), eyeRow],
      [Math.floor(w * 0.6), eyeRow],
    ],
  };
}

export const supportsCustomActor = (effectId: string): boolean => SUPPORTED.has(effectId);
