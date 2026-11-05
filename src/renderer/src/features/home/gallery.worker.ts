import { getEffect, type EffectModule } from '../../../../engine/effect-registry';
import {
  actBounds,
  backdrop,
  clearFrame,
  composite,
  createAct,
  createFrame,
  createFx,
} from '../../../../engine/pixelfx/src/core/index.js';
import { createTileScheduler, tileLayout } from './tile-scheduler';

export type GalleryMessage =
  | { type: 'tile'; id: string; canvas: OffscreenCanvas }
  | { type: 'visible' | 'hover'; id: string; on: boolean }
  | { type: 'reduced'; on: boolean };

const STEP_S = 1 / 15;
const RESTART_WAIT_S = 0.45;
const STILL_AT = 0.4;
const MAX_FLOOR = 22;

interface Tile {
  step(): void;
  draw(): void;
}

function stageSize(mod: EffectModule) {
  if (!mod.act) {
    const [w, h] = mod.meta.size as [number, number];
    return { w, h };
  }
  const b = actBounds(mod);
  return { w: b.x1 - b.x0, h: Math.min(b.y1, MAX_FLOOR) - b.y0 };
}

function createTile(mod: EffectModule, canvas: OffscreenCanvas): Tile {
  const size = stageSize(mod);
  const { width: W, height: H } = tileLayout(size.w, size.h);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const frame = createFrame(W, H);
  const img = ctx.createImageData(W, H);
  const { meta } = mod;
  const b = mod.act ? actBounds(mod) : undefined;
  const x = b
    ? Math.floor((W - size.w) / 2) - b.x0
    : Math.floor((W - size.w) / 2) + meta.origin[0]!;
  const y = b ? H - Math.min(b.y1, MAX_FLOOR) - 2 : Math.floor((H - size.h) / 2) + meta.origin[1]!;
  const bg = backdrop(meta.bg, W, H, y);
  const start = () => (mod.act ? createAct : createFx)(mod, { x, y });
  let inst = start();
  let wait = 0;
  return {
    step() {
      const finished = mod.act ? inst.done() : inst.t >= meta.duration;
      if (!meta.loop && finished) {
        wait += STEP_S;
        if (wait > RESTART_WAIT_S) {
          inst = start();
          wait = 0;
        }
      } else inst.update(STEP_S);
    },
    draw() {
      inst.draw(clearFrame(frame));
      composite(frame, img.data, bg as never);
      ctx.putImageData(img, 0, 0);
    },
  };
}

const tiles = new Map<string, Tile>();
const scheduler = createTileScheduler({ maxActive: 24 });
let reduced = false;

self.onmessage = ({ data }: MessageEvent<GalleryMessage>) => {
  if (data.type === 'tile') {
    const mod = getEffect(data.id);
    if (!mod) return;
    const tile = createTile(mod, data.canvas);
    tiles.set(data.id, tile);
    const lead = reduced ? Math.round((mod.meta.duration * STILL_AT) / STEP_S) : 0;
    for (let i = 0; i < lead; i++) tile.step();
    tile.draw();
  } else if (data.type === 'visible') scheduler.setVisible(data.id, data.on);
  else if (data.type === 'hover') scheduler.setHover(data.id, data.on);
  else {
    reduced = data.on;
    scheduler.setReduced(data.on);
  }
};

setInterval(() => {
  for (const id of scheduler.due(performance.now())) {
    const tile = tiles.get(id);
    if (!tile) continue;
    tile.step();
    tile.draw();
  }
}, 1000 / 60);
