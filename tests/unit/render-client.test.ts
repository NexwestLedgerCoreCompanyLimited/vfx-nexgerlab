import { describe, expect, it } from 'vitest';
import { createRenderClient } from '../../src/renderer/src/engine/render-client';
import { project } from '../helpers/projects';

class FakeWorker {
  sent: { id: number; frameIndex: number }[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage(m: { id: number; frameIndex: number }) {
    this.sent.push(m);
  }
  answer(i: number) {
    const m = this.sent[i]!;
    this.onmessage!({
      data: {
        id: m.id,
        frame: { width: 1, height: 1, pixels: new Uint8ClampedArray(4) },
        errors: [],
      },
    } as MessageEvent);
  }
  terminate() {}
}
const OPTIONS = { partFilter: 'whole', includeStage: false } as const;

describe('render client', () => {
  it('runs one request at a time and drops superseded previews', async () => {
    const w = new FakeWorker();
    const c = createRenderClient(w as unknown as Worker);
    const p = project([]);
    const first = c.renderLatest(p, 1, OPTIONS);
    const second = c.renderLatest(p, 2, OPTIONS);
    const third = c.renderLatest(p, 3, OPTIONS);
    expect(w.sent.map((m) => m.frameIndex)).toEqual([1]);
    w.answer(0);
    await first;
    expect(await second).toBeUndefined();
    await Promise.resolve();
    expect(w.sent.map((m) => m.frameIndex)).toEqual([1, 3]);
    w.answer(1);
    expect((await third)?.frame.width).toBe(1);
  });

  it('reports sequence progress and stops on abort without an unhandled rejection', async () => {
    const w = new FakeWorker();
    const c = createRenderClient(w as unknown as Worker);
    const abort = new AbortController();
    const progress: number[] = [];
    const seen: number[] = [];
    const run = (async () => {
      for await (const f of c.renderSequence(
        { project: project([]), frames: [0, 1, 2], options: OPTIONS },
        (d) => progress.push(d),
        abort.signal,
      )) {
        seen.push(f.width);
        abort.abort();
      }
    })();
    await Promise.resolve();
    w.answer(0);
    await run;
    expect(seen).toEqual([1]);
    expect(w.sent).toHaveLength(1);
    expect(progress).toEqual([1]);
  });
});
