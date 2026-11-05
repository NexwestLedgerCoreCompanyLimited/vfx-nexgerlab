import { createWorkerRenderClient, type RenderClient } from './render-client';

let client: RenderClient | undefined;

/** One render worker per window, so its cursors stay warm across screens. */
export function renderClient(): RenderClient {
  client ??= createWorkerRenderClient();
  return client;
}
