import type { EffectLayer, ProjectV1 } from '../../src/shared/schemas/project';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export function layer(over: Partial<EffectLayer> = {}): EffectLayer {
  return {
    id: uuid(1),
    kind: 'effect',
    effectId: 'fire/campfire',
    engineVersion: '0.3.0+a841596',
    options: {},
    seed: 1,
    flip: false,
    angle: 0,
    x: 64,
    y: 112,
    opacity: 1,
    light: 1,
    speed: 1,
    startFrame: 0,
    visible: true,
    blend: 'normal',
    placement: 'standalone',
    tracks: {},
    ...over,
  };
}

export function project(layers: EffectLayer[], over: Partial<ProjectV1> = {}): ProjectV1 {
  const now = '2026-11-05T00:00:00.000Z';
  return {
    schemaVersion: 1,
    id: uuid(2),
    name: 'test',
    canvas: { width: 128, height: 128, background: 'transparent' },
    timeline: { frames: 30, fps: 30, loop: false },
    seed: 1,
    assets: [],
    layers,
    spriteAttachments: [],
    versions: [{ id: uuid(3), label: 'Start', createdAt: now, layers: [], spriteAttachments: [] }],
    activeVersionId: uuid(3),
    presets: [],
    composerHistory: [],
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

export { uuid };
