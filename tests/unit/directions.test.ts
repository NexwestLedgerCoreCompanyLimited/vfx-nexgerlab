import { describe, expect, it } from 'vitest';
import {
  DIRECTION_BEHAVIOR,
  directionAngle,
  resolveDirectionProject,
} from '../../src/engine/directions';
import { listEffects } from '../../src/engine/effect-registry';
import { createProjectFromEffect } from '../../src/engine/project-factory';
import { hashPixels } from '../../src/engine/frame-hash';
import { createRenderCache, renderProjectFrame } from '../../src/engine/render-model';
import { DIRECTION_ORDER } from '../../src/shared/directions';

const P = (id: string) => createProjectFromEffect(id, { name: 'x', language: 'en' });
const O = { partFilter: 'whole', includeStage: false } as const;
const hash = (p: ReturnType<typeof P>, f: number) =>
  hashPixels(renderProjectFrame(p, f, new Map(), O, createRenderCache()).frame.pixels);

describe('direction order', () => {
  it('is exact and clockwise from south', () => {
    expect(DIRECTION_ORDER[1]).toEqual(['S']);
    expect(DIRECTION_ORDER[4]).toEqual(['S', 'W', 'N', 'E']);
    expect(DIRECTION_ORDER[8]).toEqual(['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']);
    expect(DIRECTION_ORDER[16]).toHaveLength(16);
    expect(DIRECTION_ORDER[16].slice(0, 3)).toEqual(['S', 'SSW', 'SW']);
  });

  it('nests each smaller count inside the larger', () => {
    expect(DIRECTION_ORDER[4].every((d) => DIRECTION_ORDER[8].includes(d as never))).toBe(true);
    expect(DIRECTION_ORDER[8].every((d) => DIRECTION_ORDER[16].includes(d as never))).toBe(true);
  });
});

describe('direction behavior', () => {
  it('covers all 244 effects', () => {
    expect(Object.keys(DIRECTION_BEHAVIOR).sort()).toEqual(
      listEffects()
        .map((e) => e.id)
        .sort(),
    );
  });

  it('keeps ground-backed and full-screen effects fixed', () => {
    for (const e of listEffects()) {
      const [w, h] = e.meta.size as [number, number];
      const screen = w >= 320 && Math.abs(w / h - 16 / 9) < 0.05;
      if (e.meta.bg === 'ground' || screen) expect(DIRECTION_BEHAVIOR[e.id], e.id).toBe('fixed');
    }
  });

  it('rotates projectiles', () => {
    expect(DIRECTION_BEHAVIOR['projectiles/arrow']).toBe('rotate-2d');
    expect(DIRECTION_BEHAVIOR['fire/fireball']).toBe('rotate-2d');
  });
});

describe('directionAngle', () => {
  it('turns an east-facing effect to point at each direction', () => {
    expect(directionAngle('E', 4)).toBeCloseTo(0);
    const deg = (d: Parameters<typeof directionAngle>[0]) =>
      ((directionAngle(d, 8) * 180) / Math.PI + 360) % 360;
    expect(deg('S')).toBeCloseTo(90);
    expect(deg('W')).toBeCloseTo(180);
    expect(deg('N')).toBeCloseTo(270);
    expect(deg('SW')).toBeCloseTo(135);
  });
});

describe('resolveDirectionProject', () => {
  it('sets the angle only on rotating layers', () => {
    const arrow = resolveDirectionProject(P('projectiles/arrow'), 'S', 4);
    expect(arrow.layers[0]!.angle).toBeCloseTo(Math.PI / 2);
    const fire = resolveDirectionProject(P('fire/campfire'), 'S', 4);
    expect(fire.layers[0]!.angle).toBe(0);
    expect(fire.canvas).toEqual(P('fire/campfire').canvas);
  });

  it('adds room so no rotation clips, and keeps the origin centered', () => {
    const p = resolveDirectionProject(P('projectiles/arrow'), 'E', 4);
    const base = P('projectiles/arrow');
    expect(p.canvas.width).toBe(p.canvas.height);
    expect(p.canvas.width).toBeGreaterThanOrEqual(
      Math.ceil(Math.hypot(base.canvas.width, base.canvas.height)),
    );
    expect(p.layers[0]!.x).toBe(p.canvas.width >> 1);
  });

  it('gives one direction exactly when asked for one', () => {
    const base = P('projectiles/arrow');
    expect(resolveDirectionProject(base, 'S', 1)).toBe(base);
  });

  it('lets an override replace rotation, palette, speed, and hidden layers', () => {
    const base = P('projectiles/arrow');
    const id = base.layers[0]!.id;
    const p = {
      ...base,
      directions: {
        count: 4 as const,
        overrides: {
          W: { angle: 1, palette: ['#000000', '#ffffff'], speed: 2 as const, hiddenLayers: [id] },
        },
      },
    };
    const west = resolveDirectionProject(p, 'W', 4);
    expect(west.layers[0]).toMatchObject({ angle: 1, speed: 2, visible: false });
    expect(west.layers[0]!.options.palette).toEqual(['#000000', '#ffffff']);
    expect(resolveDirectionProject(p, 'S', 4).layers[0]!.angle).toBeCloseTo(Math.PI / 2);
  });

  it('really draws each direction differently', () => {
    const base = P('projectiles/arrow');
    const hashes = DIRECTION_ORDER[4].map((d) => hash(resolveDirectionProject(base, d, 4), 5));
    expect(new Set(hashes).size).toBe(4);
  });
});
