import { DIRECTION_ORDER, type Direction, type DirectionCount } from '../shared/directions';
import type { DirectionOverride, EffectLayer, ProjectV1 } from '../shared/schemas/project';
import { listEffects } from './effect-registry';

export type DirectionBehavior = 'rotate-2d' | 'fixed';

// Reviewed by hand: these fly or aim, face east, and have no floor to tip over.
const ROTATING = new Set([
  'fire/fire-breath',
  'fire/fireball',
  'fire/flamethrower',
  'ice/frost-breath',
  'ice/ice-lance',
  'water/water-jet',
  'projectiles/arrow',
  'projectiles/bullet-tracer',
  'projectiles/energy-disc',
  'projectiles/laser-bolt',
  'projectiles/plasma-shot',
  'projectiles/rocket',
]);

export const DIRECTION_BEHAVIOR: Record<string, DirectionBehavior> = Object.fromEntries(
  listEffects().map((e) => [e.id, ROTATING.has(e.id) ? 'rotate-2d' : 'fixed']),
);

const MAX_SIDE = 1024;

/** The painter's angle in radians. Effects face east, so south, the first direction, is a quarter turn. */
export function directionAngle(direction: Direction, count: DirectionCount): number {
  const order: readonly string[] = DIRECTION_ORDER[count];
  const degrees = (90 + (order.indexOf(direction) * 360) / count) % 360;
  return (degrees * Math.PI) / 180;
}

const rotates = (layer: EffectLayer) => DIRECTION_BEHAVIOR[layer.effectId] === 'rotate-2d';

/** Square room around the origin, so every direction shares one cell and no rotation clips. */
function roomFor(project: ProjectV1): { side: number; dx: number; dy: number } | undefined {
  const turning = project.layers.filter(rotates);
  if (turning.length === 0) return undefined;
  const { width, height } = project.canvas;
  let reach = 0;
  for (const { x, y } of turning) {
    for (const [cx, cy] of [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ] as const) {
      reach = Math.max(reach, Math.hypot(cx - x, cy - y));
    }
  }
  const side = Math.min(MAX_SIDE, Math.ceil(reach) * 2);
  const first = turning[0]!;
  return { side, dx: (side >> 1) - first.x, dy: (side >> 1) - first.y };
}

/** The project as one direction sees it. Everything still renders through the same path. */
export function resolveDirectionProject(
  project: ProjectV1,
  direction: Direction,
  count: DirectionCount,
): ProjectV1 {
  if (count === 1) return project;
  const room = roomFor(project);
  const override = project.directions?.overrides[direction];
  const layers = project.layers.map((layer) => {
    const options = override?.palette
      ? { ...layer.options, palette: override.palette }
      : layer.options;
    return {
      ...layer,
      options,
      x: layer.x + (room?.dx ?? 0),
      y: layer.y + (room?.dy ?? 0),
      angle: override?.angle ?? (rotates(layer) ? directionAngle(direction, count) : layer.angle),
      speed: override?.speed ?? layer.speed,
      visible: layer.visible && !override?.hiddenLayers?.includes(layer.id),
    };
  });
  const canvas = room ? { ...project.canvas, width: room.side, height: room.side } : project.canvas;
  return { ...project, canvas, layers };
}

export function setDirectionCount(project: ProjectV1, count: DirectionCount): ProjectV1 {
  return { ...project, directions: { count, overrides: project.directions?.overrides ?? {} } };
}

export function setDirectionOverride(
  project: ProjectV1,
  direction: Direction,
  patch: DirectionOverride,
): ProjectV1 {
  const overrides = project.directions?.overrides ?? {};
  return {
    ...project,
    directions: {
      count: project.directions?.count ?? 1,
      overrides: { ...overrides, [direction]: { ...overrides[direction], ...patch } },
    },
  };
}

export function resetDirectionOverride(project: ProjectV1, direction: Direction): ProjectV1 {
  const { [direction]: _removed, ...overrides } = project.directions?.overrides ?? {};
  return { ...project, directions: { count: project.directions?.count ?? 1, overrides } };
}
