import { expect, test } from '@playwright/test';
import { bench, run } from '../helpers/app';
import { project, uuid } from '../helpers/projects';
import type { ProjectV1 } from '../../src/shared/schemas/project';
import type { createWorkerRenderClient } from '../../src/renderer/src/engine/render-client';

type Bench = { client: ReturnType<typeof createWorkerRenderClient> };

test('sprite attachment stays synchronized through the worker', async () => {
  const { app, page } = await bench();
  const asset = uuid(10);
  const p = project([], {
    assets: [
      {
        id: asset,
        originalName: 'a.png',
        hash: 'a'.repeat(64),
        kind: 'png',
        path: `assets/${'a'.repeat(64)}.png`,
        width: 4,
        height: 4,
        frameCount: 2,
      },
    ],
    spriteAttachments: [
      {
        id: uuid(11),
        assetId: asset,
        outputToSourceFrames: [0, 1, 0, 1],
        frameAnchors: [{ sourceFrameIndex: 1, pivot: { x: 0, y: 0 }, anchor: { x: 8, y: 8 } }],
        behindPartIds: [],
        inFrontPartIds: [],
      },
    ],
    timeline: { frames: 4, fps: 30, loop: false },
  });
  const pixels = await run(
    page,
    async ({ p, asset }: { p: ProjectV1; asset: string }) => {
      const { client } = (window as unknown as { bench: Bench }).bench;
      const paint = (c: number[]) => {
        const rgba = new Uint8ClampedArray(64);
        for (let i = 0; i < 16; i++) rgba.set(c, i * 4);
        return { width: 4, height: 4, rgba, durationMs: 100 };
      };
      client.setAssets(new Map([[asset, [paint([200, 0, 0, 255]), paint([0, 200, 0, 255])]]]));
      const at = async (f: number, x: number, y: number) => {
        const { frame } = (await client.render(p, f, {
          partFilter: 'whole',
          includeStage: false,
        }))!;
        return Array.from(
          frame.pixels.slice((y * frame.width + x) * 4, (y * frame.width + x) * 4 + 4),
        );
      };
      return [await at(0, 1, 1), await at(1, 9, 9), await at(1, 1, 1), await at(2, 1, 1)];
    },
    { p, asset },
  );
  expect(pixels).toEqual([
    [200, 0, 0, 255],
    [0, 200, 0, 255],
    [0, 0, 0, 0],
    [200, 0, 0, 255],
  ]);
  await app.close();
});
