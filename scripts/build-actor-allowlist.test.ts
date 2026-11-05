// Run with `npm run allowlist`. Lists acted effects that run a full duration with test sprites.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { spriteToActor } from '../src/engine/actor-adapter';
import { listEffects } from '../src/engine/effect-registry';
import { clearFrame, createFrame, createFx } from '../src/engine/pixelfx/src/core/index.js';

function sprite(w: number, h: number) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba.set([200, 180, 160, i % 7 === 0 ? 0 : 255], i * 4);
  return { width: w, height: h, rgba, durationMs: 100 };
}
const SPRITES = [sprite(12, 20), sprite(32, 48), sprite(8, 8)];

it('writes the allowlist', () => {
  const passing: string[] = [];
  const failing: string[] = [];
  for (const { id, module: mod, meta } of listEffects().filter((e) => e.meta.actor)) {
    const [w, h] = meta.size as [number, number];
    const frame = createFrame(w, h);
    try {
      for (const s of SPRITES) {
        const fx = createFx(mod, {
          x: 40,
          y: 60,
          actor: spriteToActor(s, { x: s.width / 2, y: s.height }),
        });
        for (let i = 0; i < Math.ceil(meta.duration * 30) + 1; i++) {
          fx.update(1 / 30);
          fx.draw(clearFrame(frame));
        }
      }
      passing.push(id);
    } catch (error) {
      failing.push(`${id}: ${(error as Error).message.slice(0, 80)}`);
    }
  }
  writeFileSync('src/engine/actor-allowlist.json', `${JSON.stringify(passing, null, 2)}\n`);
  console.log(`passing ${passing.length}, failing ${failing.length}\n${failing.join('\n')}`);
});
