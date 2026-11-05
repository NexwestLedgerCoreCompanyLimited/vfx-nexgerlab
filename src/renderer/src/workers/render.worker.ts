import { createRenderCache, renderProjectFrame } from '../../../engine/render-model';
import type { RenderOptions } from '../../../engine/render-types';
import type { AssetFrame } from '../../../shared/models/asset';
import type { ProjectV1 } from '../../../shared/schemas/project';

export interface RenderRequest {
  id: number;
  project: ProjectV1;
  frameIndex: number;
  options: RenderOptions;
  assets?: Map<string, AssetFrame[]>;
}

const cache = createRenderCache();
let assets: ReadonlyMap<string, AssetFrame[]> = new Map();

self.onmessage = (event: MessageEvent<RenderRequest>) => {
  const { id, project, frameIndex, options } = event.data;
  if (event.data.assets) assets = event.data.assets;
  const port = self as unknown as Worker;
  try {
    const { frame, errors } = renderProjectFrame(project, frameIndex, assets, options, cache);
    port.postMessage({ id, frame, errors }, [frame.pixels.buffer]);
  } catch (error) {
    port.postMessage({ id, failure: (error as Error).message });
  }
};
