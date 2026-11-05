import { describe, expect, it, vi } from 'vitest';
import {
  SPLASH_TIMING,
  drawSplash,
  nextSplashTime,
  simTime,
  splashStart,
  STATIC_FRAME,
} from '../../src/renderer/src/features/splash/splash-effect';

function recordingContext(log: string[]) {
  const ctx: Record<string, unknown> = {};
  for (const m of ['fillRect', 'drawImage', 'fillText', 'clearRect', 'setTransform']) {
    ctx[m] = (...a: unknown[]) =>
      log.push(`${m}:${a.map((v) => (typeof v === 'object' ? 'img' : String(v))).join(',')}`);
  }
  return new Proxy(ctx, {
    set(t, k, v) {
      if (k === 'fillStyle' || k === 'font') log.push(`${String(k)}=${String(v)}`);
      t[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

class FakeOffscreen {
  constructor(
    public width: number,
    public height: number,
  ) {}
  getContext() {
    return recordingContext([]);
  }
}

function run(t: number) {
  vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
  const log: string[] = [];
  const ctx = recordingContext(log);
  Object.assign(ctx, { canvas: { width: 1280, height: 720 } });
  drawSplash(ctx, {} as CanvasImageSource, t, { progress: 0.5, status: 'status' });
  return log;
}

describe('splash timing', () => {
  it('uses the approved beat table', () => {
    expect(SPLASH_TIMING).toEqual({
      charge: 180,
      hit: 700,
      free: 790,
      reveal: 1250,
      settle: 1700,
      end: 2000,
    });
  });

  it('freezes simulated time during the hit-stop', () => {
    expect(simTime(699)).toBe(699);
    expect(simTime(700)).toBe(700);
    expect(simTime(789)).toBe(700);
    expect(simTime(800)).toBe(710);
  });

  it('starts at 0 on first launch, 1250 later, and is static under reduced motion', () => {
    expect(splashStart({ hasSeenSplash: false, reducedMotion: false })).toBe(0);
    expect(splashStart({ hasSeenSplash: true, reducedMotion: false })).toBe(1250);
    expect(splashStart({ hasSeenSplash: false, reducedMotion: true })).toBe(STATIC_FRAME);
  });

  it('holds on the settled frame until ready', () => {
    expect(nextSplashTime(1680, 16, false)).toBe(1690);
    expect(nextSplashTime(1690, 16, false)).toBe(1690);
    expect(nextSplashTime(1690, 16, true)).toBe(1700);
  });

  it('skips the remaining hold frames once ready and the wordmark is done', () => {
    expect(nextSplashTime(1000, 16, true)).toBe(1016);
    expect(nextSplashTime(1590, 16, true)).toBe(1700);
    expect(nextSplashTime(1800, 16, true)).toBe(1816);
  });

  it('never moves past the end', () => {
    expect(nextSplashTime(1995, 16, true)).toBe(2000);
  });
});

describe('drawSplash', () => {
  it('issues identical drawing for the same time', () => {
    for (const t of [60, 420, 720, 760, 1040, 1560, 1860]) expect(run(t)).toEqual(run(t));
  });

  it('flashes once for 34 ms at the hit', () => {
    const flash = 'fillStyle=#E8FDFF';
    expect(run(690)).not.toContain(flash);
    expect(run(700)).toContain(flash);
    expect(run(733)).toContain(flash);
    expect(run(734)).not.toContain(flash);
  });

  it('never draws flash, shake, or dissolve on the static frame', () => {
    const log = run(STATIC_FRAME);
    expect(log).not.toContain('fillStyle=#E8FDFF');
    expect(log.filter((l) => l.startsWith('fillRect')).length).toBeLessThan(120);
  });
});
