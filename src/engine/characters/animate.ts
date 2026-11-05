import { DIRECTION_ORDER, type Direction, type DirectionCount } from '../../shared/directions';
import { buildSheetMetadata } from '../exporters/metadata';
import { calculateSheetLayout, packSheet } from '../exporters/spritesheet';
import { posed, skeleton } from '../pixelfx/src/core/rig.js';
import type { FrameRGBA } from '../render-types';
import type { CharacterSpec } from './spec';

type Pose = Record<string, unknown>;

const CELL_W = 96;
const CELL_H = 72;
const FEET_X = 48;
const FEET_Y = 66;
const REST_W = 24;
const FPS = 12;
const INK = [23, 18, 31, 255];
const BASE: Pose = { fx: -3, fy: -15, bx: 5, by: -15, ffx: -2, ffy: -4, fbx: 3, fby: -4 };

function cycle(steps: number, stride: number, lift: number, extra: Pose): Pose[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    return {
      ...BASE,
      ...extra,
      ffx: stride * s,
      fbx: -stride * s,
      ffy: -4 - Math.max(0, c) * lift,
      fby: -4 - Math.max(0, -c) * lift,
      fx: -2 - (stride / 2) * s,
      bx: 3 + (stride / 2) * s,
      crouch: Math.abs(Math.sin(a * 2)) * 1.5 + (Number(extra.crouch) || 0),
    };
  });
}

const GUARD: Pose = {
  ...BASE,
  crouch: 3,
  fx: 11,
  fy: -21,
  bx: 9,
  by: -21,
  ffx: 7,
  fbx: -7,
  sa: -0.75,
};

export const ANIMATIONS = {
  idle: () => [0, 1, 1, 0].map((up) => ({ ...BASE, crouch: up, fy: -15 + up, by: -15 + up })),
  walk: () => cycle(8, 5, 2.5, {}),
  run: () => cycle(8, 8, 4.5, { lean: 3, crouch: 2, fy: -20, by: -20 }),
  jump: () => [
    { ...BASE, crouch: 5 },
    { ...BASE, y: -6, fy: -24, by: -24 },
    { ...BASE, y: -13, fy: -30, by: -30, ffy: -8, fby: -6 },
    { ...BASE, y: -14, fy: -28, by: -28, ffy: -9, fby: -7 },
    { ...BASE, y: -7, fy: -22, by: -22 },
    { ...BASE, crouch: 6 },
  ],
  attack: () => [
    GUARD,
    { ...GUARD, crouch: 4, lean: -4, fx: -9, fy: -33, sa: -2.7, bx: 9, by: -22 },
    { ...GUARD, crouch: 4, lean: -4, fx: -9, fy: -33, sa: -2.7, bx: 9, by: -22 },
    { ...GUARD, crouch: 4, lean: 5, fx: 24, fy: -19, sa: 0.6, ffx: 13, fbx: -10 },
    { ...GUARD, crouch: 5, lean: 6, fx: 22, fy: -12, sa: 1.1, ffx: 13, fbx: -10 },
    GUARD,
  ],
  cast: () => [
    { ...BASE, fx: 8, fy: -22, bx: 8, by: -22 },
    { ...BASE, lean: -2, fx: 6, fy: -30, bx: 2, by: -30 },
    { ...BASE, lean: -3, fx: 4, fy: -36, bx: 0, by: -36 },
    { ...BASE, lean: 3, crouch: 2, fx: 18, fy: -24, bx: 16, by: -22 },
    { ...BASE, lean: 3, crouch: 2, fx: 18, fy: -24, bx: 16, by: -22 },
    { ...BASE, fx: 8, fy: -22, bx: 8, by: -22 },
  ],
  hurt: () => [
    { ...BASE, lean: -6, crouch: 2, fx: -8, fy: -20, bx: 0, by: -20 },
    { ...BASE, lean: -4, crouch: 3 },
    { ...BASE, lean: -1, crouch: 1 },
  ],
  death: () => [
    { ...BASE, lean: -5, crouch: 2 },
    { ...BASE, lean: -8, crouch: 6 },
    { ...BASE, lean: -10, crouch: 11, ffx: 6, fbx: 9 },
    { ...BASE, lean: -12, crouch: 15, ffx: 8, fbx: 11 },
  ],
} as const satisfies Record<string, () => Pose[]>;

export type AnimationName = keyof typeof ANIMATIONS;
export const LOOPING: ReadonlySet<AnimationName> = new Set(['idle', 'walk', 'run']);

export const animationFrames = (name: AnimationName): Pose[] => ANIMATIONS[name]();

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};

/** Keeps the rig's light and shade, and swaps its grey for this body part's color. */
function shade(base: [number, number, number], lum: number): number[] {
  const k = 0.45 + lum * 0.95;
  return [...base.map((v) => Math.min(255, v * k)), 255];
}

function regionColor(spec: CharacterSpec, src: number, away: boolean): string {
  const row = Math.floor(src / REST_W);
  const col = src % REST_W;
  if (row <= 2) return spec.hair;
  if (row <= 8) return away ? spec.hair : spec.skin;
  if (row <= 22) return row >= 20 && (col < 7 || col > 17) ? spec.skin : spec.top;
  return row >= 34 ? spec.boots : spec.bottom;
}

const YAW: Record<string, number> = { E: 0, S: -Math.PI / 2, W: Math.PI, N: Math.PI / 2 };

function yawFor(direction: Direction): number {
  const order: readonly string[] = DIRECTION_ORDER[16];
  return YAW[direction] ?? -(order.indexOf(direction) * Math.PI) / 8 - Math.PI / 2;
}

function put(px: Uint8ClampedArray, x: number, y: number, color: number[]): void {
  if (x < 0 || y < 0 || x >= CELL_W || y >= CELL_H) return;
  px.set(color, (y * CELL_W + x) * 4);
}

function drawHat(px: Uint8ClampedArray, spec: CharacterSpec, x: number, y: number): void {
  if (spec.hat !== 'pointed') return;
  const color = rgb(spec.top);
  for (let i = 0; i < 9; i++) {
    const half = Math.max(0, 5 - Math.ceil(i * 0.65));
    for (let dx = -half; dx <= half; dx++) put(px, x + dx, y - i, shade(color, dx < 0 ? 0.5 : 0.8));
  }
  for (let dx = -7; dx <= 7; dx++) put(px, x + dx, y + 1, shade(color, 0.45));
}

export function renderCharacterFrame(
  spec: CharacterSpec,
  name: AnimationName,
  index: number,
  direction: Direction,
): FrameRGBA {
  const list = animationFrames(name);
  const pose = {
    ...list[index % list.length],
    yaw: yawFor(direction),
    ...(spec.weapon ? { weapon: spec.weapon } : {}),
  };
  const r = posed(pose);
  const pixels = new Uint8ClampedArray(CELL_W * CELL_H * 4);
  const away = direction.startsWith('N');
  for (let i = 0; i < r.n; i++) {
    const x = FEET_X + r.xs[i]!;
    const y = FEET_Y + r.ys[i]!;
    const c = r.color[i]!;
    const parts = [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
    const src = r.src[i]!;
    if (src < 0) put(pixels, x, y, [...parts, 255]);
    else if (r.ink[i]) put(pixels, x, y, INK);
    else {
      const lum = (0.3 * parts[0]! + 0.59 * parts[1]! + 0.11 * parts[2]!) / 255;
      put(pixels, x, y, shade(rgb(regionColor(spec, src, away)), lum));
    }
  }
  const { head, crown } = skeleton(pose).joints as Record<string, number[]>;
  const hx = FEET_X + Math.round(head![0]!);
  const hy = FEET_Y + Math.round(head![1]!);
  if (!away && spec.hat !== 'helmet') {
    const side = direction.endsWith('E') ? 2 : direction.endsWith('W') ? -2 : 0;
    if (side) put(pixels, hx + side, hy, INK);
    else {
      put(pixels, hx - 2, hy, INK);
      put(pixels, hx + 2, hy, INK);
    }
  }
  drawHat(pixels, spec, FEET_X + Math.round(crown![0]!), FEET_Y + Math.round(crown![1]!));
  return { width: CELL_W, height: CELL_H, pixels };
}

export function renderCharacterSheet(
  spec: CharacterSpec,
  name: AnimationName,
  count: DirectionCount,
) {
  const order = DIRECTION_ORDER[count];
  const frames = animationFrames(name).length;
  const layout = calculateSheetLayout({
    frameWidth: CELL_W,
    frameHeight: CELL_H,
    frames,
    directions: order,
  });
  const list: FrameRGBA[] = [];
  for (const direction of order) {
    for (let i = 0; i < frames; i++) list.push(renderCharacterFrame(spec, name, i, direction));
  }
  const fixed = count > 1 ? layout : { ...layout, columns: frames, rows: 1 };
  const metadata = buildSheetMetadata({
    layout,
    image: `${name}.png`,
    fps: FPS,
    loop: LOOPING.has(name),
    pivot: [FEET_X, FEET_Y],
    layers: [],
    source: { projectId: spec.name, versionId: name },
  });
  return { sheet: packSheet(layout, list), layout: fixed, metadata, frames: list };
}
