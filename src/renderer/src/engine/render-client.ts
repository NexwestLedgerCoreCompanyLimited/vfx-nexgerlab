import type { FrameRGBA, RenderOptions, RenderResult } from '../../../engine/render-types';
import type { AssetFrame } from '../../../shared/models/asset';
import type { ProjectV1 } from '../../../shared/schemas/project';
import type { RenderRequest } from '../workers/render.worker';

export interface SequenceRequest {
  project: ProjectV1;
  frames: number[];
  options: RenderOptions;
}

interface Job {
  request: Omit<RenderRequest, 'id'>;
  resolve(result: RenderResult | undefined): void;
}

type WorkerReply = { id: number } & (RenderResult | { failure: string });

/** One or more layers could not be drawn, so the frames are incomplete. */
export class RenderFailedError extends Error {}

export function createRenderClient(worker: Worker) {
  let nextId = 1;
  let active: Job | undefined;
  let activeId = 0;
  const queue: Job[] = [];
  let latest: Job | undefined;
  let pendingAssets: Map<string, AssetFrame[]> | undefined;
  let failure = '';

  function pump(): void {
    if (active) return;
    const job = queue.shift() ?? latest;
    if (job === latest) latest = undefined;
    if (!job) return;
    active = job;
    activeId = nextId++;
    const message: RenderRequest = { id: activeId, ...job.request };
    if (pendingAssets) message.assets = pendingAssets;
    pendingAssets = undefined;
    worker.postMessage(message);
  }

  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    if (event.data.id !== activeId || !active) return;
    const job = active;
    active = undefined;
    if ('failure' in event.data) {
      failure = event.data.failure;
      job.resolve(undefined);
    } else job.resolve({ frame: event.data.frame, errors: event.data.errors });
    pump();
  };

  worker.onerror = () => {
    failure = 'worker stopped';
    const jobs = [active, latest, ...queue.splice(0)];
    active = undefined;
    latest = undefined;
    for (const job of jobs) job?.resolve(undefined);
  };

  const render = (project: ProjectV1, frameIndex: number, options: RenderOptions) =>
    new Promise<RenderResult | undefined>((resolve) => {
      queue.push({ request: { project, frameIndex, options }, resolve });
      pump();
    });

  return {
    setAssets(assets: Map<string, AssetFrame[]>): void {
      pendingAssets = assets;
    },

    render,

    /** For previews: a newer request replaces one that has not started, which resolves undefined. */
    renderLatest(project: ProjectV1, frameIndex: number, options: RenderOptions) {
      return new Promise<RenderResult | undefined>((resolve) => {
        latest?.resolve(undefined);
        latest = { request: { project, frameIndex, options }, resolve };
        pump();
      });
    },

    async *renderSequence(
      request: SequenceRequest,
      onProgress: (done: number, total: number) => void,
      signal: AbortSignal,
    ): AsyncIterable<FrameRGBA> {
      let done = 0;
      for (const frameIndex of request.frames) {
        if (signal.aborted) return;
        const result = await render(request.project, frameIndex, request.options);
        if (signal.aborted) return;
        if (!result) throw new RenderFailedError(failure || 'render stopped');
        if (result.errors.length > 0) {
          throw new RenderFailedError(result.errors.map((e) => e.message).join('; '));
        }
        onProgress(++done, request.frames.length);
        yield result.frame;
      }
    },

    dispose: () => worker.terminate(),
  };
}

export type RenderClient = ReturnType<typeof createRenderClient>;

export const createWorkerRenderClient = () =>
  createRenderClient(
    new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' }),
  );
