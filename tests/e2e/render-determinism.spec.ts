import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bench, run } from '../helpers/app';
import { layer, project } from '../helpers/projects';
import type { RenderOptions } from '../../src/engine/render-types';
import type { ProjectV1 } from '../../src/shared/schemas/project';
import type { createWorkerRenderClient } from '../../src/renderer/src/engine/render-client';

type Args = { p: ProjectV1; o: RenderOptions };
type Bench = {
  client: ReturnType<typeof createWorkerRenderClient>;
  hashPixels(p: Uint8ClampedArray): string;
};
const OPTIONS = { partFilter: 'whole', includeStage: false } as const;
const golden = JSON.parse(readFileSync(join(__dirname, '../fixtures/golden/render.json'), 'utf8'));

test('canonical renderer matches Node golden hashes in a real worker', async () => {
  const { app, page } = await bench();
  const hashes = await run(
    page,
    async ({ p, o }: Args) => {
      const { client, hashPixels } = (window as unknown as { bench: Bench }).bench;
      const out: string[] = [];
      for (const f of [0, 7, 29])
        out.push(hashPixels((await client.render(p, f, o))!.frame.pixels));
      return out;
    },
    { p: project([layer()]), o: OPTIONS },
  );
  expect(hashes).toEqual(golden.campfire);
  await app.close();
});

test('canonical renderer repeats pixels for shuffled requests and sequences', async () => {
  const { app, page } = await bench();
  const result = await run(
    page,
    async ({ p, o }: Args) => {
      const { client, hashPixels } = (window as unknown as { bench: Bench }).bench;
      const at = async (f: number) => hashPixels((await client.render(p, f, o))!.frame.pixels);
      const order = [9, 2, 14, 2, 9];
      const shuffled: string[] = [];
      for (const f of order) shuffled.push(await at(f));
      const sequence: string[] = [];
      const signal = new AbortController().signal;
      for await (const frame of client.renderSequence(
        { project: p, frames: [2, 9, 14], options: o },
        () => {},
        signal,
      )) {
        sequence.push(hashPixels(frame.pixels));
      }
      return { shuffled, sequence };
    },
    { p: project([layer({ effectId: 'explosions/small-explosion', x: 64, y: 110 })]), o: OPTIONS },
  );
  expect(result.shuffled[0]).toBe(result.shuffled[4]);
  expect(result.shuffled[1]).toBe(result.shuffled[3]);
  expect(result.sequence).toEqual([result.shuffled[1], result.shuffled[0], result.shuffled[2]]);
  await app.close();
});

test('canonical renderer reports a broken layer and keeps rendering', async () => {
  const { app, page } = await bench();
  const errors = await run(
    page,
    async ({ p, o }: Args) =>
      (await (window as unknown as { bench: Bench }).bench.client.render(p, 3, o))!.errors,
    { p: project([layer({ effectId: 'no/such' })]), o: OPTIONS },
  );
  expect(errors[0]?.message).toBe('unknown-effect');
  await app.close();
});
